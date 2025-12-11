import { supabase } from '../supabase';

export interface FileGenerationParams {
    organizationId: string;
    payrollRunId?: string;
    fileType: 'WPS_SIF' | 'WPS_TXT' | 'WPS_CSV';
    fileFormat: 'sif' | 'txt' | 'csv';
    fileBlob: Blob;
    payPeriod: {
        month: number;
        year: number;
        start: Date;
        end: Date;
    };
    employerId?: string;
    employerName?: string;
    totalEmployees: number;
    totalAmount: number;
    validationStatus?: 'pending' | 'passed' | 'failed' | 'warning';
    validationErrors?: any[];
    validationWarnings?: any[];
}

export interface PayrollFileGeneration {
    id: string;
    organization_id: string;
    payroll_run_id?: string;
    file_type: string;
    file_format: string;
    file_name: string;
    file_path: string;
    file_size: number;
    pay_period_month: number;
    pay_period_year: number;
    pay_period_start: string;
    pay_period_end: string;
    employer_id?: string;
    employer_name?: string;
    total_employees: number;
    total_amount: number;
    currency: string;
    validation_status: string;
    validation_errors: any[];
    validation_warnings: any[];
    validated_at?: string;
    generated_by: string;
    generated_at: string;
    downloaded_count: number;
    last_downloaded_at?: string;
    is_submitted: boolean;
    submitted_at?: string;
    submitted_by?: string;
    notes?: string;
}

/**
 * Save a generated payroll file to storage and database
 */
export async function saveFileGeneration(params: FileGenerationParams): Promise<PayrollFileGeneration> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    // Generate file name with timestamp
    const timestamp = new Date().getTime();
    const fileName = `${params.fileType}_${params.payPeriod.year}${String(params.payPeriod.month).padStart(2, '0')}_${timestamp}.${params.fileFormat}`;

    // Create storage path: {org_id}/{year}/{month}/{filename}
    const filePath = `${params.organizationId}/${params.payPeriod.year}/${params.payPeriod.month}/${fileName}`;

    try {
        // Upload to Supabase Storage
        const { data: uploadData, error: uploadError } = await supabase.storage
            .from('payroll-files')
            .upload(filePath, params.fileBlob, {
                contentType: getContentType(params.fileFormat),
                upsert: false,
                cacheControl: '3600'
            });

        if (uploadError) {
            console.error('Storage upload error:', uploadError);
            throw new Error(`Failed to upload file: ${uploadError.message}`);
        }

        // Save record to database
        const { data, error } = await supabase
            .from('payroll_file_generations')
            .insert({
                organization_id: params.organizationId,
                payroll_run_id: params.payrollRunId,
                file_type: params.fileType,
                file_format: params.fileFormat,
                file_name: fileName,
                file_path: filePath,
                file_size: params.fileBlob.size,
                pay_period_month: params.payPeriod.month,
                pay_period_year: params.payPeriod.year,
                pay_period_start: params.payPeriod.start.toISOString().split('T')[0],
                pay_period_end: params.payPeriod.end.toISOString().split('T')[0],
                employer_id: params.employerId,
                employer_name: params.employerName,
                total_employees: params.totalEmployees,
                total_amount: params.totalAmount,
                generated_by: user.id,
                validation_status: params.validationStatus || 'pending',
                validation_errors: params.validationErrors || [],
                validation_warnings: params.validationWarnings || [],
                validated_at: params.validationStatus && params.validationStatus !== 'pending' ? new Date().toISOString() : null
            })
            .select()
            .single();

        if (error) {
            console.error('Database insert error:', error);
            // Try to clean up uploaded file
            await supabase.storage.from('payroll-files').remove([filePath]);
            throw new Error(`Failed to save file record: ${error.message}`);
        }

        return data;
    } catch (error) {
        console.error('Error in saveFileGeneration:', error);
        throw error;
    }
}

/**
 * Download a payroll file from storage
 */
export async function downloadPayrollFile(fileId: string): Promise<void> {
    try {
        // Get file record
        const { data: fileRecord, error: recordError } = await supabase
            .from('payroll_file_generations')
            .select('*')
            .eq('id', fileId)
            .single();

        if (recordError) throw new Error(`Failed to fetch file record: ${recordError.message}`);
        if (!fileRecord) throw new Error('File not found');

        // Download from storage
        const { data: fileData, error: downloadError } = await supabase.storage
            .from('payroll-files')
            .download(fileRecord.file_path);

        if (downloadError) throw new Error(`Failed to download file: ${downloadError.message}`);

        // Update download count
        await supabase
            .from('payroll_file_generations')
            .update({
                downloaded_count: (fileRecord.downloaded_count || 0) + 1,
                last_downloaded_at: new Date().toISOString()
            })
            .eq('id', fileId);

        // Trigger browser download
        const url = URL.createObjectURL(fileData);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileRecord.file_name;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    } catch (error) {
        console.error('Error in downloadPayrollFile:', error);
        throw error;
    }
}

/**
 * Get file generation history for an organization
 */
export async function getFileGenerationHistory(
    organizationId: string,
    filters?: {
        year?: number;
        month?: number;
        fileType?: string;
        validationStatus?: string;
    }
): Promise<PayrollFileGeneration[]> {
    let query = supabase
        .from('payroll_file_generations')
        .select('*')
        .eq('organization_id', organizationId)
        .order('generated_at', { ascending: false });

    if (filters?.year) {
        query = query.eq('pay_period_year', filters.year);
    }
    if (filters?.month) {
        query = query.eq('pay_period_month', filters.month);
    }
    if (filters?.fileType) {
        query = query.eq('file_type', filters.fileType);
    }
    if (filters?.validationStatus) {
        query = query.eq('validation_status', filters.validationStatus);
    }

    const { data, error } = await query;

    if (error) {
        console.error('Error fetching file history:', error);
        throw new Error(`Failed to fetch file history: ${error.message}`);
    }

    return data || [];
}

/**
 * Mark a file as submitted
 */
export async function markFileAsSubmitted(fileId: string, notes?: string): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { error } = await supabase
        .from('payroll_file_generations')
        .update({
            is_submitted: true,
            submitted_at: new Date().toISOString(),
            submitted_by: user.id,
            notes: notes
        })
        .eq('id', fileId);

    if (error) {
        throw new Error(`Failed to mark file as submitted: ${error.message}`);
    }
}

/**
 * Update validation status for a file
 */
export async function updateValidationStatus(
    fileId: string,
    status: 'passed' | 'failed' | 'warning',
    errors: any[] = [],
    warnings: any[] = []
): Promise<void> {
    const { error } = await supabase
        .from('payroll_file_generations')
        .update({
            validation_status: status,
            validation_errors: errors,
            validation_warnings: warnings,
            validated_at: new Date().toISOString()
        })
        .eq('id', fileId);

    if (error) {
        throw new Error(`Failed to update validation status: ${error.message}`);
    }
}

/**
 * Delete a file generation record and its file from storage
 */
export async function deleteFileGeneration(fileId: string): Promise<void> {
    // Get file record first
    const { data: fileRecord, error: fetchError } = await supabase
        .from('payroll_file_generations')
        .select('file_path')
        .eq('id', fileId)
        .single();

    if (fetchError) throw new Error(`Failed to fetch file: ${fetchError.message}`);

    // Delete from storage
    const { error: storageError } = await supabase.storage
        .from('payroll-files')
        .remove([fileRecord.file_path]);

    if (storageError) {
        console.warn('Failed to delete file from storage:', storageError);
    }

    // Delete from database
    const { error: dbError } = await supabase
        .from('payroll_file_generations')
        .delete()
        .eq('id', fileId);

    if (dbError) {
        throw new Error(`Failed to delete file record: ${dbError.message}`);
    }
}

/**
 * Get content type based on file format
 */
function getContentType(format: string): string {
    switch (format.toLowerCase()) {
        case 'sif':
            return 'text/plain';
        case 'txt':
            return 'text/plain';
        case 'csv':
            return 'text/csv';
        default:
            return 'application/octet-stream';
    }
}
