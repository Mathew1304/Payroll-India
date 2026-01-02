export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type UserRole = 'super_admin' | 'admin' | 'hr' | 'finance' | 'manager' | 'employee';
export type EmploymentType = 'full_time' | 'part_time' | 'contract' | 'intern';
export type EmploymentStatus = 'active' | 'probation' | 'resigned' | 'terminated' | 'on_hold';
export type Gender = 'male' | 'female' | 'other';
export type MaritalStatus = 'single' | 'married' | 'divorced' | 'widowed';
export type AttendanceStatus = 'present' | 'absent' | 'half_day' | 'leave' | 'holiday' | 'week_off';
export type LeaveStatus = 'pending' | 'approved' | 'rejected' | 'cancelled';
export type PayrollStatus = 'draft' | 'processed' | 'approved' | 'paid';
export type SalaryComponentType = 'earning' | 'deduction';
export type ReimbursementStatus = 'pending' | 'approved' | 'rejected' | 'paid';
export type DocumentType = 'offer_letter' | 'id_proof' | 'address_proof' | 'educational' | 'experience' | 'other';

export interface Database {
  public: {
    Tables: {
      user_profiles: {
        Row: {
          id: string;
          user_id: string | null;
          employee_id: string | null;
          role: UserRole;
          is_active: boolean;
          last_login: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['user_profiles']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['user_profiles']['Insert']>;
      };
      departments: {
        Row: {
          id: string;
          name: string;
          code: string;
          description: string | null;
          head_id: string | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
          organization_id: string;
        };
        Insert: Omit<Database['public']['Tables']['departments']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['departments']['Insert']>;
      };
      designations: {
        Row: {
          id: string;
          title: string;
          code: string;
          level: number | null;
          description: string | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
          organization_id: string;
        };
        Insert: Omit<Database['public']['Tables']['designations']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['designations']['Insert']>;
      };
      branches: {
        Row: {
          id: string;
          name: string;
          code: string;
          address: string | null;
          city: string | null;
          state: string | null;
          pincode: string | null;
          phone: string | null;
          email: string | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
          organization_id: string;
        };
        Insert: Omit<Database['public']['Tables']['branches']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['branches']['Insert']>;
      };
      employees: {
        Row: {
          id: string;
          user_id: string | null;
          employee_code: string | null;
          first_name: string;
          middle_name: string | null;
          last_name: string;
          date_of_birth: string | null;
          gender: Gender | null;
          marital_status: MaritalStatus | null;
          blood_group: string | null;
          personal_email: string | null;
          company_email: string | null;
          mobile_number: string;
          alternate_number: string | null;
          current_address: string | null;
          permanent_address: string | null;
          city: string | null;
          state: string | null;
          pincode: string | null;
          nationality: string | null;
          religion: string | null;
          place_of_birth: string | null;
          department_id: string | null;
          designation_id: string | null;
          branch_id: string | null;
          reporting_manager_id: string | null;
          employment_type: EmploymentType;
          employment_status: EmploymentStatus;
          date_of_joining: string;
          probation_end_date: string | null;
          confirmation_date: string | null;
          resignation_date: string | null;
          last_working_date: string | null;
          contract_start_date: string | null;
          contract_end_date: string | null;
          contract_duration_months: number | null;
          notice_period_days: number | null;
          pan_number: string | null;
          aadhaar_number: string | null;
          uan_number: string | null;
          esi_number: string | null;
          passport_number: string | null;
          passport_expiry: string | null;
          passport_issue_date: string | null;
          passport_issue_place: string | null;
          visa_number: string | null;
          visa_expiry: string | null;
          visa_issue_date: string | null;
          visa_sponsor: string | null;
          driving_license_number: string | null;
          driving_license_expiry: string | null;

          // Qatar Fields
          qatar_id: string | null;
          qatar_id_expiry: string | null;
          residence_permit_number: string | null;
          residence_permit_expiry: string | null;
          work_permit_number: string | null;
          work_permit_expiry: string | null;
          health_card_number: string | null;
          health_card_expiry: string | null;
          labor_card_number: string | null;
          labor_card_expiry: string | null;
          sponsor_name: string | null;
          sponsor_id: string | null;
          medical_fitness_certificate: string | null;
          medical_fitness_expiry: string | null;
          police_clearance_certificate: string | null;
          police_clearance_expiry: string | null;

          // Saudi Fields
          iqama_number: string | null;
          iqama_expiry: string | null;
          gosi_number: string | null;
          border_number: string | null;
          muqeem_id: string | null;
          kafala_sponsor_name: string | null;
          kafala_sponsor_id: string | null;
          jawazat_number: string | null;
          absher_id: string | null;
          medical_insurance_number: string | null;
          medical_insurance_provider: string | null;
          medical_insurance_expiry: string | null;

          // Banking & Tax
          bank_name: string | null;
          bank_account_number: string | null;
          bank_ifsc_code: string | null;
          bank_branch: string | null;
          bank_iban: string | null;
          professional_tax_number: string | null;
          pf_account_number: string | null;
          pf_uan: string | null;
          gratuity_nominee_name: string | null;
          gratuity_nominee_relationship: string | null;
          lwf_number: string | null;

          // Allowances & Benefits
          ctc_annual: number | null;
          basic_salary: number | null;
          accommodation_provided: boolean | null;
          accommodation_address: string | null;
          accommodation_type: string | null;
          accommodation_allowance: number | null;
          transportation_provided: boolean | null;
          transportation_allowance: number | null;
          food_allowance: number | null;
          other_allowances: Json | null;
          insurance_policy_number: string | null;
          insurance_provider: string | null;
          insurance_coverage_amount: number | null;
          insurance_expiry: string | null;
          dependents_covered: number | null;
          end_of_service_benefit_eligible: boolean | null;
          annual_leave_days: number | null;
          sick_leave_days: number | null;

          // Personal & Professional
          father_name: string | null;
          mother_name: string | null;
          spouse_name: string | null;
          number_of_children: number | null;
          emergency_contact_name: string | null;
          emergency_contact_relationship: string | null;
          emergency_contact_phone: string | null;
          emergency_contact_alternate: string | null;
          highest_qualification: string | null;
          institution: string | null;
          year_of_completion: number | null;
          specialization: string | null;
          additional_qualifications: Json | null;
          previous_employer: string | null;
          previous_designation: string | null;
          previous_employment_from: string | null;
          previous_employment_to: string | null;
          previous_salary: number | null;
          reason_for_leaving: string | null;
          total_experience_years: number | null;
          skills: Json | null;
          certifications: Json | null;
          languages_known: Json | null;
          medical_conditions: string | null;
          allergies: string | null;
          disabilities: string | null;
          hobbies: string | null;
          linkedin_url: string | null;
          github_url: string | null;
          portfolio_url: string | null;
          professional_summary: string | null;
          work_location: string | null;
          job_grade: string | null;
          job_level: string | null;

          is_active: boolean;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['employees']['Row'], 'id' | 'employee_code' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['employees']['Insert']>;
      };

      leave_applications: {
        Row: {
          id: string;
          employee_id: string;
          leave_type_id: string;
          from_date: string;
          to_date: string;
          is_half_day: boolean;
          half_day_period: string | null;
          total_days: number;
          reason: string;
          document_url: string | null;
          status: LeaveStatus;
          applied_at: string;
          reviewed_by: string | null;
          reviewed_at: string | null;
          rejection_reason: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['leave_applications']['Row'], 'id' | 'applied_at' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['leave_applications']['Insert']>;
      };
      payslips: {
        Row: {
          id: string;
          payroll_cycle_id: string;
          employee_id: string;
          working_days: number;
          present_days: number;
          leave_days: number;
          lop_days: number;
          paid_days: number;
          gross_salary: number;
          total_earnings: number;
          total_deductions: number;
          net_salary: number;
          earnings: Json;
          deductions: Json;
          remarks: string | null;
          is_emailed: boolean;
          emailed_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['payslips']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['payslips']['Insert']>;
      };
      announcements: {
        Row: {
          id: string;
          title: string;
          content: string;
          type: string;
          priority: string;
          is_active: boolean;
          published_at: string;
          expires_at: string | null;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['announcements']['Row'], 'id' | 'published_at' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['announcements']['Insert']>;
      };
      employee_notifications: {
        Row: {
          id: string;
          employee_id: string;
          title: string;
          message: string;
          type: string;
          is_read: boolean;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['employee_notifications']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['employee_notifications']['Insert']>;
      };
      helpdesk_categories: {
        Row: {
          id: string;
          organization_id: string;
          name: string;
          icon: string | null;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['helpdesk_categories']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['helpdesk_categories']['Insert']>;
      };
      tickets: {
        Row: {
          id: string;
          organization_id: string;
          ticket_number: string;
          subject: string;
          description: string | null;
          category_id: string | null;
          priority: 'Low' | 'Medium' | 'High';
          status: 'Open' | 'In Progress' | 'Resolved' | 'Closed';
          created_by: string;
          assigned_to: string | null;
          due_date: string | null;
          resolved_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['tickets']['Row'], 'id' | 'ticket_number' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['tickets']['Row']>;
      };
      ticket_comments: {
        Row: {
          id: string;
          ticket_id: string;
          user_id: string;
          comment_text: string;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['ticket_comments']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['ticket_comments']['Row']>;
      };
      ticket_history: {
        Row: {
          id: string;
          ticket_id: string;
          user_id: string;
          action: string;
          old_value: string | null;
          new_value: string | null;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['ticket_history']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['ticket_history']['Row']>;
      };
      goal_types: {
        Row: {
          id: string;
          organization_id: string;
          name: string;
          is_active: boolean;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['goal_types']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['goal_types']['Row']>;
      };
      goals: {
        Row: {
          id: string;
          organization_id: string;
          employee_id: string;
          created_by: string;
          title: string;
          description: string | null;
          goal_type_id: string | null;
          department_id: string | null;
          status: 'Not Started' | 'In Progress' | 'Completed' | 'Overdue' | 'Cancelled';
          priority: 'Low' | 'Medium' | 'High' | 'Critical';
          start_date: string;
          due_date: string;
          completion_date: string | null;
          progress_percentage: number;
          weight: number | null;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['goals']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['goals']['Row']>;
      };
      goal_milestones: {
        Row: {
          id: string;
          goal_id: string;
          title: string;
          description: string | null;
          due_date: string | null;
          is_completed: boolean;
          completed_date: string | null;
          completed_by: string | null;
          display_order: number;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['goal_milestones']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['goal_milestones']['Row']>;
      };
      performance_reviews: {
        Row: {
          id: string;
          organization_id: string;
          employee_id: string;
          reviewer_id: string;
          review_period_start: string;
          review_period_end: string;
          review_type: 'Annual' | 'Mid-Year' | 'Quarterly' | 'Probation' | 'Project-Based';
          status: 'Draft' | 'In Progress' | 'Completed' | 'Approved';
          overall_rating: number | null;
          strengths: string | null;
          areas_for_improvement: string | null;
          achievements: string | null;
          goals_for_next_period: string | null;
          manager_comments: string | null;
          employee_comments: string | null;
          reviewed_date: string | null;
          approved_date: string | null;
          approved_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['performance_reviews']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['performance_reviews']['Row']>;
      };
      review_categories: {
        Row: {
          id: string;
          organization_id: string;
          name: string;
          weight: number;
          display_order: number;
          is_active: boolean;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['review_categories']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['review_categories']['Row']>;
      };
      review_ratings: {
        Row: {
          id: string;
          review_id: string;
          category_id: string;
          rating: number | null;
          comments: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['review_ratings']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['review_ratings']['Row']>;
      };
      goal_comments: {
        Row: {
          id: string;
          goal_id: string;
          user_id: string;
          comment_text: string;
          is_private: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['goal_comments']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['goal_comments']['Row']>;
      };
      performance_analytics: {
        Row: {
          id: string;
          organization_id: string;
          employee_id: string;
          period_start: string;
          period_end: string;
          goals_completed: number;
          goals_overdue: number;
          average_rating: number | null;
          total_reviews: number;
          calculated_at: string;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['performance_analytics']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['performance_analytics']['Row']>;
      };
      office_locations: {
        Row: {
          id: string;
          organization_id: string;
          name: string;
          address: string | null;
          latitude: number;
          longitude: number;
          radius_meters: number;
          is_active: boolean;
          requires_gps: boolean;
          timezone: string;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['office_locations']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['office_locations']['Row']>;
      };
      work_schedules: {
        Row: {
          id: string;
          organization_id: string;
          name: string;
          start_time: string;
          end_time: string;
          grace_period_minutes: number;
          working_days: number[]; // JSONB array
          is_default: boolean;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['work_schedules']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['work_schedules']['Row']>;
      };
      employee_schedules: {
        Row: {
          id: string;
          organization_id: string;
          employee_id: string;
          schedule_id: string;
          effective_from: string;
          effective_until: string | null;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['employee_schedules']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['employee_schedules']['Row']>;
      };
      // Overwriting existing attendance_records to match new schema
      attendance_records: {
        Row: {
          id: string;
          organization_id: string;
          employee_id: string;
          date: string;
          check_in_time: string | null;
          check_in_location_id: string | null;
          check_in_latitude: number | null;
          check_in_longitude: number | null;
          check_in_device_info: Json | null;
          check_out_time: string | null;
          check_out_latitude: number | null;
          check_out_longitude: number | null;
          status: 'Present' | 'Absent' | 'Late' | 'Half Day' | 'Remote' | 'On Leave' | 'Holiday';
          work_type: 'In Office' | 'Remote' | 'Hybrid' | null;
          total_hours: number | null;
          notes: string | null;
          approved_by: string | null;
          approval_notes: string | null;
          is_manual_entry: boolean;
          gps_verified: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['attendance_records']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['attendance_records']['Row']>;
      };
      leave_requests: {
        Row: {
          id: string;
          organization_id: string;
          employee_id: string;
          leave_type: 'Sick Leave' | 'Casual Leave' | 'Vacation' | 'Maternity' | 'Paternity' | 'Unpaid Leave' | 'Compensatory Off';
          start_date: string;
          end_date: string;
          total_days: number;
          reason: string;
          status: 'Pending' | 'Approved' | 'Rejected';
          reviewed_by: string | null;
          reviewed_at: string | null;
          review_notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['leave_requests']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['leave_requests']['Row']>;
      };
      holidays: {
        Row: {
          id: string;
          organization_id: string;
          name: string;
          date: string;
          is_optional: boolean;
          description: string | null;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['holidays']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['holidays']['Row']>;
      };
      attendance_settings: {
        Row: {
          id: string;
          organization_id: string;
          auto_absent_enabled: boolean;
          auto_absent_time: string;
          allow_remote_checkin: boolean;
          require_checkout: boolean;
          max_work_hours_per_day: number;
          overtime_threshold_minutes: number;
          gps_accuracy_threshold_meters: number;
          allow_manual_attendance: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['attendance_settings']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['attendance_settings']['Row']>;
      };
      attendance_anomalies: {
        Row: {
          id: string;
          organization_id: string;
          attendance_record_id: string | null;
          anomaly_type: string;
          detected_at: string;
          severity: 'Low' | 'Medium' | 'High' | null;
          details: Json | null;
          is_resolved: boolean;
          resolved_by: string | null;
          resolved_at: string | null;
          resolution_notes: string | null;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['attendance_anomalies']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['attendance_anomalies']['Row']>;
      };
      employee_invitations: {
        Row: {
          id: string;
          organization_id: string;
          employee_id: string;
          email: string;
          invitation_code: string;
          onboarding_token: string;
          invitation_type: string;
          invited_by: string;
          status: string;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['employee_invitations']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['employee_invitations']['Row']>;
      };
      salary_components: {
        Row: {
          id: string;
          organization_id: string;
          employee_id: string;
          basic_salary: number;
          housing_allowance: number;
          food_allowance: number;
          transport_allowance: number;
          mobile_allowance: number;
          utility_allowance: number;
          other_allowances: number;
          effective_from: string;
          effective_to: string | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['salary_components']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['salary_components']['Row']>;
      };
      qatar_salary_components: {
        Row: {
          id: string;
          organization_id: string;
          employee_id: string;
          basic_salary: number;
          housing_allowance: number;
          food_allowance: number;
          transport_allowance: number;
          mobile_allowance: number;
          utility_allowance: number;
          other_allowances: number;
          effective_from: string;
          effective_to: string | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['qatar_salary_components']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['qatar_salary_components']['Row']>;
      };
      saudi_salary_components: {
        Row: {
          id: string;
          organization_id: string;
          employee_id: string;
          basic_salary: number;
          housing_allowance: number;
          food_allowance: number;
          transport_allowance: number;
          mobile_allowance: number;
          utility_allowance: number;
          other_allowances: number;
          effective_from: string;
          effective_to: string | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['saudi_salary_components']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['saudi_salary_components']['Row']>;
        organization_admins: {
        Row: {
          id: string;
          organization_id: string;
          user_id: string;
          first_name: string | null;
          last_name: string | null;
          email: string | null;
          mobile_number: string | null;
          alternate_number: string | null;
          gender: string | null;
          date_of_birth: string | null;
          date_of_joining: string | null;
          designation: string | null;
          admin_code: string | null;
          current_address: string | null;
          city: string | null;
          state: string | null;
          pincode: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['organization_admins']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['organization_admins']['Insert']>;
      };
    };

    Views: {};
    Functions: {};
    Enums: {
      user_role: UserRole;
      employment_type: EmploymentType;
      employment_status: EmploymentStatus;
      gender: Gender;
      marital_status: MaritalStatus;
      attendance_status: AttendanceStatus;
      leave_status: LeaveStatus;
      payroll_status: PayrollStatus;
      salary_component_type: SalaryComponentType;
      reimbursement_status: ReimbursementStatus;
      document_type: DocumentType;
    };
  };
}
