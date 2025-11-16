'use client';

import React, { useState, useRef, useEffect } from 'react';
import { ChatMessage } from '../types';
import { askGeminiWithMaps } from '../services/geminiService';
import Spinner from './Spinner';
import { Send, MapPin, Link } from 'lucide-react';
import Button from './Button';

const GeminiChat: React.FC = () => {
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(scrollToBottom, [messages]);

    const handleSend = async () => {
        if (!input.trim() || isLoading) return;

        const userMessage: ChatMessage = { sender: 'user', text: input };
        setMessages(prev => [...prev, userMessage]);
        setInput('');
        setIsLoading(true);
        setError(null);
        
        try {
            const result = await askGeminiWithMaps(input);
            const geminiMessage: ChatMessage = {
                sender: 'gemini',
                text: result.text,
                sources: result.sources,
            };
            setMessages(prev => [...prev, geminiMessage]);
        } catch (e: unknown) {
            const errorMessage = e instanceof Error ? e.message : 'An unknown error occurred.';
            setError(errorMessage);
        } finally {
            setIsLoading(false);
        }
    };
    
    const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            handleSend();
        }
    };

    return (
        <div className="flex flex-col h-full bg-gray-900 border-t border-gray-700">
            <div className="flex-grow p-4 overflow-y-auto">
                {messages.length === 0 && (
                    <div className="flex flex-col items-center justify-center h-full text-center text-gray-500">
                        <MapPin className="w-16 h-16 mb-4"/>
                        <p className="text-lg">Ask for places nearby!</p>
                        <p>e.g., &quot;Good Italian restaurants&quot;, &quot;parks with playgrounds&quot;, or &quot;coffee shops open late&quot;</p>
                    </div>
                )}
                {messages.map((msg, index) => (
                    <div key={index} className={`flex mb-4 ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`rounded-lg px-4 py-2 max-w-lg ${msg.sender === 'user' ? 'bg-teal-600 text-white' : 'bg-gray-700 text-white'}`}>
                            <p className="whitespace-pre-wrap">{msg.text}</p>
                             {msg.sender === 'gemini' && msg.sources && msg.sources.length > 0 && (
                                <div className="mt-3 border-t border-gray-600 pt-2">
                                    <h4 className="text-xs font-semibold text-gray-400 mb-1">Sources:</h4>
                                    <div className="flex flex-col space-y-1">
                                    {msg.sources.map((source, i) => (
                                        <a href={source.uri} target="_blank" rel="noopener noreferrer" key={i} className="text-sm text-teal-400 hover:underline flex items-center">
                                            <Link className="w-3 h-3 mr-2 flex-shrink-0" />
                                            <span className="truncate">{source.title || 'View on Map'}</span>
                                        </a>
                                    ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                ))}
                {isLoading && (
                    <div className="flex justify-start mb-4">
                        <div className="rounded-lg px-4 py-2 bg-gray-700 text-white flex items-center">
                           <Spinner className="mr-2"/> Thinking...
                        </div>
                    </div>
                )}
                 {error && (
                    <div className="rounded-lg p-3 bg-red-900/50 text-red-400 text-sm">
                        <p><strong>Error:</strong> {error}</p>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>
            <div className="p-4 bg-gray-900 border-t border-gray-700 flex items-center">
                <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="Ask Gemini..."
                    className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-l-md focus:outline-none focus:ring-2 focus:ring-teal-500"
                    disabled={isLoading}
                />
                <Button onClick={handleSend} disabled={isLoading || !input.trim()} className="rounded-l-none">
                    <Send className="h-5 w-5" />
                </Button>
            </div>
        </div>
    );
};

export default GeminiChat;
