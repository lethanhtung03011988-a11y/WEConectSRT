
import React, { useState, useCallback, ChangeEvent } from 'react';
import { generateTranscription } from './services/geminiService';
import { TranscriptionSegment } from './types';

// Helper function to format seconds into SRT timestamp format HH:MM:SS,ms
const formatTime = (totalSeconds: number): string => {
    const hours = Math.floor(totalSeconds / 3600).toString().padStart(2, '0');
    const minutes = Math.floor((totalSeconds % 3600) / 60).toString().padStart(2, '0');
    const seconds = Math.floor(totalSeconds % 60).toString().padStart(2, '0');
    const milliseconds = Math.round((totalSeconds - Math.floor(totalSeconds)) * 1000).toString().padStart(3, '0');
    return `${hours}:${minutes}:${seconds},${milliseconds}`;
};

// Helper function to convert JSON transcription to SRT format
const jsonToSrt = (transcription: TranscriptionSegment[]): string => {
    return transcription.map((segment, index) => {
        const startTime = formatTime(segment.start);
        const endTime = formatTime(segment.end);
        return `${index + 1}\n${startTime} --> ${endTime}\n${segment.text.trim()}\n`;
    }).join('\n');
};

const UploadIcon: React.FC = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
    </svg>
);

const DownloadIcon: React.FC = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
    </svg>
);

const ProcessingIcon: React.FC = () => (
    <svg className="animate-spin h-5 w-5 mr-3 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
);

const App: React.FC = () => {
    const [audioFile, setAudioFile] = useState<File | null>(null);
    const [referenceText, setReferenceText] = useState<string | null>(null);
    const [srtContent, setSrtContent] = useState<string>('');
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);

    const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setAudioFile(file);
            setSrtContent('');
            setError(null);
        }
    };
    
    const handleTextFileChange = (e: ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
                setReferenceText(event.target?.result as string);
            };
            reader.onerror = () => {
                setError("Failed to read the reference text file.");
                setReferenceText(null);
            };
            reader.readAsText(file);
        } else {
            setReferenceText(null);
        }
    };

    const handleGenerateSrt = useCallback(async () => {
        if (!audioFile) return;

        setIsLoading(true);
        setError(null);
        setSrtContent('');

        try {
            const transcriptionResult = await generateTranscription(audioFile, referenceText);
            const srt = jsonToSrt(transcriptionResult);
            setSrtContent(srt);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An unexpected error occurred.');
        } finally {
            setIsLoading(false);
        }
    }, [audioFile, referenceText]);
    
    const handleDownloadSrt = () => {
        if (!srtContent || !audioFile) return;

        const blob = new Blob([srtContent], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        const fileNameWithoutExtension = audioFile.name.split('.').slice(0, -1).join('.');
        a.download = `${fileNameWithoutExtension || 'subtitles'}.srt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    return (
        <div className="min-h-screen bg-gray-900 text-white flex flex-col items-center p-4 sm:p-6 md:p-8">
            <div className="w-full max-w-3xl mx-auto">
                <header className="text-center mb-8">
                    <h1 className="text-4xl sm:text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-indigo-600">
                        Audio to SRT Generator
                    </h1>
                    <p className="text-gray-400 mt-2">
                        Upload an audio file and get perfectly synchronized subtitles in seconds.
                    </p>
                </header>

                <main className="bg-gray-800 rounded-lg shadow-2xl p-6 sm:p-8 space-y-6">
                    <div className="space-y-4">
                        <label htmlFor="audio-upload" className="block text-lg font-medium text-gray-300">
                            1. Thêm file audio
                        </label>
                        <div className="flex items-center space-x-4">
                            <label className="cursor-pointer inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 focus:ring-offset-gray-800 transition-colors">
                                <UploadIcon />
                                <span>{audioFile ? 'Change File' : 'Select Audio File'}</span>
                                <input id="audio-upload" type="file" accept="audio/*" className="hidden" onChange={handleFileChange} />
                            </label>
                            {audioFile && <span className="text-gray-400 truncate">{audioFile.name}</span>}
                        </div>
                    </div>
                    
                    <div className="space-y-4">
                        <label htmlFor="text-upload" className="block text-lg font-medium text-gray-300">
                           2. (Tùy chọn) Thêm file văn bản tham khảo để tăng độ chính xác
                        </label>
                        <div className="flex items-center space-x-4">
                             <label className="cursor-pointer inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-gray-600 hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 focus:ring-offset-gray-800 transition-colors">
                                <UploadIcon />
                                <span>{referenceText ? 'Change Text File' : 'Select Text File'}</span>
                                <input id="text-upload" type="file" accept=".txt,text/plain" className="hidden" onChange={handleTextFileChange} />
                            </label>
                            {referenceText && <span className="text-gray-400 truncate">Reference text loaded.</span>}
                        </div>
                    </div>
                    
                    <button
                        onClick={handleGenerateSrt}
                        disabled={!audioFile || isLoading}
                        className="w-full flex justify-center items-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-purple-600 hover:bg-purple-700 disabled:bg-gray-500 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 focus:ring-offset-gray-800 transition-all duration-300"
                    >
                        {isLoading ? (
                            <>
                                <ProcessingIcon />
                                <span>Đang xử lý...</span>
                            </>
                        ) : (
                            '3. Tạo file SRT'
                        )}
                    </button>
                    
                    {error && (
                        <div className="bg-red-900/50 text-red-300 p-4 rounded-md text-center">
                           <p><strong>Error:</strong> {error}</p>
                        </div>
                    )}
                    
                    {srtContent && (
                        <div className="space-y-4">
                             <div className="flex justify-between items-center">
                                <h2 className="text-lg font-medium text-gray-300">4. Xem trước & xuất file SRT</h2>
                                <button
                                    onClick={handleDownloadSrt}
                                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 focus:ring-offset-gray-800 transition-colors"
                                >
                                    <DownloadIcon />
                                    <span>Xuất ra file SRT</span>
                                </button>
                            </div>
                           
                            <textarea
                                readOnly
                                value={srtContent}
                                className="w-full h-64 p-4 bg-gray-900 text-gray-300 rounded-md border border-gray-700 focus:ring-indigo-500 focus:border-indigo-500 font-mono text-sm"
                                placeholder="SRT content will appear here..."
                            />
                        </div>
                    )}
                </main>
            </div>
        </div>
    );
};

export default App;