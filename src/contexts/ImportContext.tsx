import React, { createContext, useContext, useState, ReactNode } from 'react';

interface ImportState {
    isOpen: boolean;
    file: File | null;
    parsedData: any[];
    step: 'upload' | 'preview' | 'importing' | 'complete';
    importProgress: number;
    importResults: { success: number; failed: number } | null;
    failedRowDetails: any[];
    isMinimized: boolean;
}

interface ImportContextType {
    state: ImportState;
    openModal: () => void;
    closeModal: () => void;
    minimizeModal: () => void;
    maximizeModal: () => void;
    setFile: (file: File | null) => void;
    setParsedData: (data: any[]) => void;
    setStep: (step: 'upload' | 'preview' | 'importing' | 'complete') => void;
    setImportProgress: (progress: number) => void;
    setImportResults: (results: { success: number; failed: number } | null) => void;
    setFailedRowDetails: (details: any[]) => void;
    resetImport: () => void;
}

const ImportContext = createContext<ImportContextType | undefined>(undefined);

export function ImportProvider({ children }: { children: ReactNode }) {
    const [state, setState] = useState<ImportState>({
        isOpen: false,
        file: null,
        parsedData: [],
        step: 'upload',
        importProgress: 0,
        importResults: null,
        failedRowDetails: [],
        isMinimized: false
    });

    const openModal = () => setState(prev => ({ ...prev, isOpen: true, isMinimized: false }));
    const closeModal = () => {
        if (state.step === 'importing') {
            // If importing, just minimize instead of closing
            minimizeModal();
        } else {
            resetImport();
        }
    };
    const minimizeModal = () => setState(prev => ({ ...prev, isOpen: false, isMinimized: true }));
    const maximizeModal = () => setState(prev => ({ ...prev, isOpen: true, isMinimized: false }));

    const setFile = (file: File | null) => setState(prev => ({ ...prev, file }));
    const setParsedData = (parsedData: any[]) => setState(prev => ({ ...prev, parsedData }));
    const setStep = (step: 'upload' | 'preview' | 'importing' | 'complete') => setState(prev => ({ ...prev, step }));
    const setImportProgress = (importProgress: number) => setState(prev => ({ ...prev, importProgress }));
    const setImportResults = (importResults: { success: number; failed: number } | null) => setState(prev => ({ ...prev, importResults }));
    const setFailedRowDetails = (failedRowDetails: any[]) => setState(prev => ({ ...prev, failedRowDetails }));

    const resetImport = () => setState({
        isOpen: false,
        file: null,
        parsedData: [],
        step: 'upload',
        importProgress: 0,
        importResults: null,
        failedRowDetails: [],
        isMinimized: false
    });

    return (
        <ImportContext.Provider value={{
            state,
            openModal,
            closeModal,
            minimizeModal,
            maximizeModal,
            setFile,
            setParsedData,
            setStep,
            setImportProgress,
            setImportResults,
            setFailedRowDetails,
            resetImport
        }}>
            {children}
        </ImportContext.Provider>
    );
}

export function useImport() {
    const context = useContext(ImportContext);
    if (context === undefined) {
        throw new Error('useImport must be used within an ImportProvider');
    }
    return context;
}
