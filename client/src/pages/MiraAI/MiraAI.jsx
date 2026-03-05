import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import './MiraAI.css';



const MiraAI = () => {
    const predefinedPrompts = [
        // TaskHub - Dashboard
        "Get all projects for this user: %%(name)%%.",
        "Get details for this project: %%(project name/code)%%.",
        "Get project timeline for: %%(project name)%%.",
        "Get project assignees for: %%(project name)%%.",
        "Get recent projects for this user: %%(name)%%.",
        "Get filtered projects by date: %%(from-date)%% to %%(to-date)%%.",
        "Get active projects for this user: %%(name)%%.",
        "Get project managers for: %%(project name)%%.",
        "Get project status for: %%(project name)%%.",
        "Get all tasks for this user: %%(name)%%.",
        "Get task details: %%(task title/id)%%.",
        "Get pending tasks for this user: %%(name)%%.",
        "Get completed tasks for this user: %%(name)%%.",
        "Get overdue tasks for this user: %%(name)%%.",
        "Get tasks due on: %%(date)%%.",
        "Get tasks with no due date for this user: %%(name)%%.",
        "Get all logged time for this user: %%(name)%%.",
        "Get logged time for project: %%(project name)%%.",
        "Get logged time for date: %%(date)%%.",
        "Get detailed time logs for user: %%(name)%%.",
        "Get total logged hours for: %%(project name)%%.",
        "Get all bugs assigned to this user: %%(name)%%.",
        "Get details for this bug: %%(bug title/id)%%.",
        "Get open bugs for this user: %%(name)%%.",
        "Get bugs due on: %%(date)%%.",
        "Get pending bugs for: %%(project name)%%.",
        "Get bug status for: %%(bug title/id)%%.",
        "Get bugs created in project: %%(project name)%%.",

        // TaskHub - Projects
        "Get details for this project: %%(project name)%%.",
        "Get date range for this project: %%(project name)%%.",
        "Get account manager for this project: %%(project name)%%.",
        "Get project manager for this project: %%(project name)%%.",
        "Get assignees for this project: %%(project name)%%.",
        "Get project type for this project: %%(project name)%%.",
        "Get all active projects.",
        "Get all projects sorted by start date.",
        "Get all projects sorted by end date.",
        "Get all projects sorted by project manager.",
        "Get all projects sorted by account manager.",
        "Get projects for this account manager: %%(AM name)%%.",
        "Get project count for this account manager: %%(AM name)%%.",
        "Get projects for this project manager: %%(PM name)%%.",
        "Get project count for this project manager: %%(PM name)%%.",
        "Get projects for this project type: %%(project type)%%.",
        "Get project count for this project type: %%(project type)%%.",
        "Get projects assigned to: %%(employee name)%%.",
        "Get project count for assignee: %%(employee name)%%.",
        "Get projects starting on: %%(date)%%.",
        "Get projects ending on: %%(date)%%.",
        "Get projects between dates: %%(start date)%% to %%(end date)%%.",
        "Get overdue projects as of today.",

        // TaskHub - Projects - Overview
        "Get project progress timeline for this project: %%(project name)%%.",
        "Get project progress summary for this project: %%(project name)%%.",
        "Get total estimated time for this project: %%(project name)%%.",
        "Get total logged time for this project: %%(project name)%%.",
        "Get estimated vs logged time for this project: %%(project name)%%.",
        "Get time variance for this project: %%(project name)%%.",
        "Get my overdue tasks for this project: %%(project name)%%.",
        "Get all overdue tasks for this project: %%(project name)%%.",
        "Get my tasks due today for this project: %%(project name)%%.",
        "Get all tasks due today for this project: %%(project name)%%.",
        "Get my upcoming tasks for this project: %%(project name)%%.",
        "Get all upcoming tasks for this project: %%(project name)%%.",
        "Get my tasks with no date for this project: %%(project name)%%.",
        "Get all tasks with no date for this project: %%(project name)%%.",

        // TaskHub - Projects - Discussion
        "Get details for this discussion topic: %%(discussion title)%%.",
        "Get all discussion topics in this project: %%(project name)%%.",
        "Get attachments for this discussion topic: %%(discussion title)%%.",
        "Get discussions created by: %%(user name)%%.",
        "Search discussion topics by keyword: %%(keyword)%%.",

        // TaskHub - Projects - Tasks
        "Get all task lists for this project: %%(project name)%%.",
        "Get tasks under this list: %%(list/milestone name)%%.",
        "Get all lists for this project: %%(project name)%%.",
        "Get details for this task: %%(task name)%%.",
        "Get assignees for this task: %%(task name)%%.",
        "Get estimated time for this task: %%(task name)%%.",
        "Get logged time for this task: %%(task name)%%.",
        "Get labels for this task: %%(task name)%%.",
        "Get start and end dates for this task: %%(task name)%%.",
        "Get comments for this task: %%(task name)%%.",
        "Get all to-do tasks for this project: %%(project name)%%.",
        "Get all in-progress tasks for this project: %%(project name)%%.",
        "Get all on-hold tasks for this project: %%(project name)%%.",
        "Get all completed tasks for this project: %%(project name)%%.",
        "Get tasks assigned to this user: %%(user name)%%.",
        "Get task count for this user: %%(user name)%%.",
        "Get tasks starting on: %%(date)%%.",
        "Get tasks ending on: %%(date)%%.",
        "Get tasks between dates: %%(start date)%% to %%(end date)%%.",
        "Get overdue tasks for this project: %%(project name)%%.",
        "Get today's tasks for this project: %%(project name)%%.",
        "Get upcoming tasks for this project: %%(project name)%%.",
        "Get monthly recurring tasks for this project: %%(project name)%%.",
        "Get yearly recurring tasks for this project: %%(project name)%%.",
        "Get all tasks for this project: %%(project name)%%.",
        "Get all active tasks for this project: %%(project name)%%.",
        "Get all unassigned tasks for this project: %%(project name)%%.",
        "Get all tasks sorted by start date for this project: %%(project name)%%.",
        "Get all tasks sorted by end date for this project: %%(project name)%%.",
        "Get all tasks sorted by status for this project: %%(project name)%%.",
        "Get all recurring tasks for this project: %%(project name)%%.",

        // TaskHub - Projects - Bugs
        "Get details for this bug: %%(bug title/id)%%.",
        "Get status for this bug: %%(bug title/id)%%.",
        "Get assignee for this bug: %%(bug title/id)%%.",
        "Get labels for this bug: %%(bug title/id)%%.",
        "Get estimated time for this bug: %%(bug title/id)%%.",
        "Get date range for this bug: %%(bug title/id)%%.",
        "Get associated task for this bug: %%(bug title/id)%%.",
        "Get all bugs.",
        "Get all bugs with status: Open.",
        "Get all bugs with status: In Progress.",
        "Get all bugs with status: To be Tested.",
        "Get all bugs with status: On Hold.",
        "Get all bugs with status: Closed.",
        "Get bug count for status: %%(status name)%%.",
        "Search bug by title: %%(keyword)%%.",
        "Search bug by task: %%(task keyword)%%.",
        "Get all bugs assigned to: %%(assignee name)%%.",
        "Get bug count for assignee: %%(assignee name)%%.",
        "Get all bugs with label: %%(label)%%.",
        "Get bug count for label: %%(label)%%.",
        "Get bugs starting on: %%(date)%%.",
        "Get bugs ending on: %%(date)%%.",
        "Get bugs between dates: %%(start)%% to %%(end)%%.",
        "Get overdue bugs as of today.",

        // TaskHub - Projects - Notes
        "Get all notes in this project: %%(project name)%%.",
        "Get details for this note: %%(note title)%%.",
        "Get note content for: %%(note title)%%.",
        "Get subscribers for this note: %%(note title)%%.",
        "Get clients for this note: %%(note title)%%.",
        "Get notes created by: %%(user name)%%.",
        "Search notes by keyword: %%(keyword)%%.",

        // TaskHub - Projects - Files
        "Get all files in this project: %%(project name)%%.",
        "Get all folders in this project: %%(project name)%%.",
        "Get all files in this task list: %%(task list name)%%.",
        "Get all folders in this task list: %%(task list name)%%.",
        "Get all files in this task: %%(task title)%%.",
        "Get all folders in this task: %%(task title)%%.",
        "Get all files in this bug: %%(bug title)%%.",
        "Get all folders in this bug: %%(bug title)%%.",

        // TaskHub - Projects - Time
        "Get total logged time for project: %%(project name)%%.",
        "Get total logged time for task: %%(task name/id)%%.",
        "Get total logged time for bug: %%(bug name/id)%%.",
        "Get total logged time for tasklist: %%(tasklist name)%%.",
        "Get all time logs in this project: %%(project name)%%.",
        "Get all time logs by user: %%(user name)%%.",
        "Get total logged time for user: %%(user name)%%.",
        "Get time logs between dates: %%(start date)%% to %%(end date)%%.",
        "Get time logs on date: %%(date)%%.",
        "Get total logged time between dates: %%(start date)%% to %%(end date)%%.",

        // TaskHub - Users - Employees
        "Get details for this user: %%(user name)%%.",
        "Get email for this user: %%(user name)%%.",
        "Get role for this user: %%(user name)%%.",
        "Get status for this user: %%(user name)%%.",
        "Get all users with role: Account Manager.",
        "Get all users with role: Admin.",
        "Get all users with role: Team Leader.",
        "Get all users with role: Project Coordinator.",
        "Get all users with role: User.",
        "Get count of users with role: %%(role name)%%.",
        "Get all users with status: Active.",
        "Get all users with status: Deactivated.",
        "Get count of active users.",
        "Get count of deactivated users.",
        "Get users with role: %%(role name)%% and status: %%(status)%%.",

        // TaskHub - Users - Clients
        "Get details for this client: %%(client name/id)%%.",
        "Get email for this client: %%(client name)%%.",
        "Get company name for this client: %%(client name)%%.",
        "Get contact number for this client: %%(client name)%%.",
        "Get status for this client: %%(client name)%%.",
        "Get list of all clients.",
        "Get list of all active clients.",
        "Get list of all inactive clients.",
        "Get count of active clients.",
        "Get count of inactive clients.",
        "Get clients with status: %%(status)%%.",

        // TaskHub - Feedback - Positive Reviews
        "Get details for this positive review: %%(project name/ID)%%.",
        "Get client name for this positive review: %%(project name/ID)%%.",
        "Get feedback type for this positive review: %%(project name/ID)%%.",
        "Get NDA status for this positive review: %%(project name/ID)%%.",
        "Get date for this positive review: %%(project name/ID)%%.",
        "Get review created by user: %%(project name/ID)%%.",
        "Get all positive reviews.",
        "Get all positive reviews for project: %%(project name)%%.",
        "Get all positive reviews with feedback type: %%(feedback type)%%.",
        "Get all positive reviews handled by Account Manager: %%(AM name)%%.",
        "Get all positive reviews handled by Project Manager: %%(PM name)%%.",
        "Get count of positive reviews.",
        "Get count of positive reviews by Account Manager: %%(AM name)%%."
    ];


    const [chatHistory, setChatHistory] = useState([]);
    const [messages, setMessages] = useState([]);
    const [latestQuestion, setLatestQuestion] = useState('');
    const [aiResponse, setAiResponse] = useState('');
    const [inputValue, setInputValue] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [requestError, setRequestError] = useState('');
    const [editingMessageId, setEditingMessageId] = useState(null);
    const [editedText, setEditedText] = useState('');
    const [copiedMessageId, setCopiedMessageId] = useState(null);
    const [showPromptModal, setShowPromptModal] = useState(false);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [filteredPrompts, setFilteredPrompts] = useState([]);
    const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState(-1);
    const messagesEndRef = useRef(null);
    const textareaRef = useRef(null);
    const suggestionsRef = useRef(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [latestQuestion, aiResponse, isLoading, chatHistory]);

    useEffect(() => {
        if (textareaRef.current && !inputValue) {
            textareaRef.current.style.height = 'auto';
        }
    }, [inputValue]);

    useEffect(() => {
        // handleGetChatResponse();
    }, []);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (suggestionsRef.current && !suggestionsRef.current.contains(event.target) &&
                textareaRef.current && !textareaRef.current.contains(event.target)) {
                setShowSuggestions(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    useEffect(() => {
        if (selectedSuggestionIndex >= 0 && suggestionsRef.current) {
            const selectedElement = suggestionsRef.current.children[selectedSuggestionIndex];
            if (selectedElement) {
                selectedElement.scrollIntoView({
                    behavior: 'smooth',
                    block: 'nearest'
                });
            }
        }
    }, [selectedSuggestionIndex]);

    // Helper function to remove placeholders from text
    // Helper function to replace placeholders with editable text
    const removePlaceholders = (text) => {
        return text.replace(/%%\(([^)]+)\)%%/g, (match, placeholder) => {
            return `[${placeholder}]`; // Replace with [name], [month], etc.
        });
    };
    // Helper function to remove placeholders for API
    const removePlaceholdersForAPI = (text) => {
        return text.replace(/%%\([^)]+\)%%/g, '');
    };

    // Helper function to remove square bracket placeholders like [name]
    const removeBracketPlaceholders = (text) => {
        return text.replace(/\[([^\[\]]+)\]/g, '$1');
    };

    // Combined helper to prepare questions before sending to API
    const sanitizeQuestionForAPI = (text) => {
        return removeBracketPlaceholders(removePlaceholdersForAPI(text));
    };

    // Helper function to convert placeholders to editable format
    const convertPlaceholdersToEditable = (text) => {
        return text.replace(/%%\(([^)]+)\)%%/g, (match, placeholder) => {
            return `[${placeholder}]`;
        });
    };

    // Helper function to render text with highlighted placeholders
    const renderHighlightedText = (text) => {
        const parts = text.split(/(%%.+?%%)/g);
        return parts.map((part, index) => {
            if (part.match(/%%\(.+?\)%%/)) {
                const placeholder = part.replace(/%%\(|\)%%/g, '');
                return (
                    <span key={index} className="placeholder-highlight">
                        {placeholder}
                    </span>
                );
            }
            return <span key={index}>{part}</span>;
        });
    };

    const parseResponse = (data) => {
        let responseData = data.answer ?? data.response ?? data.result ?? data.message ?? data;
        console.log(data.collection, "data collection")
        if (typeof responseData === 'string') {
            try {
                responseData = JSON.parse(responseData);
            } catch (e) {
                return { type: 'text', content: responseData };
            }
        }
        if (data.collection === 'emloyee_docs' || data.collection === 'employee_docs') {
            if (responseData.results && Array.isArray(responseData.results)) {
                return { type: 'documents', content: responseData.results };
            }
        }
        if (data.collection == 'apihits') {
            if (responseData.results) {
                return { type: 'apihits', content: responseData.results };
            }
        }

        if (data.collection === 'organization-policies') {
            if (responseData.results && Array.isArray(responseData.results)) {
                return { type: 'policies', content: responseData.results };
            }
        }

        if (responseData.results && Array.isArray(responseData.results)) {
            if (responseData.results.length === 0) {
                return { type: 'empty', content: null };
            } else if (responseData.results.length > 1) {
                return { type: 'table', content: responseData.results };
            } else if (responseData.results.length === 1) {
                return { type: 'list', content: responseData.results[0] };
            }
        }

        if (Array.isArray(responseData)) {
            if (responseData.length === 0) {
                return { type: 'empty', content: null };
            } else if (responseData.length > 1) {
                return { type: 'table', content: responseData };
            } else if (responseData.length === 1) {
                return { type: 'list', content: responseData[0] };
            }
        }

        if (typeof responseData === 'object' && responseData !== null) {
            return { type: 'list', content: responseData };
        }

        return { type: 'text', content: JSON.stringify(responseData) };
    };

    // Common API function for asking questions
    const askQuestion = async (question) => {
        try {
            const sanitizedQuestion = sanitizeQuestionForAPI(question);
            const body = {
                question: sanitizedQuestion, // Remove placeholders before sending
                searchType: "regex"
            };

            const response = await axios.post(`${process.env.REACT_APP_TAKSHUB_AI_URL}/api/ask`, body);

            return response.data;
        } catch (error) {
            console.error('Failed to fetch AI response:', error);
            throw new Error('Sorry, I could not retrieve a response. Please try again in a moment.');
        }
    };

    const handleGetChatResponse = async () => {
        try {
            const response = await axios.get(`${process.env.REACT_APP_TAKSHUB_AI_URL}/chats`, {
                params: {  }

            });

            // Parse each chat and store in state
            const parsedChats = response.data.chats.map(chat => ({
                question: chat.question,
                response: parseResponse({ results: JSON.parse(chat.response) })
            }));

            setChatHistory(parsedChats);
        } catch (error) {
            console.error('Failed to fetch chat history:', error);
        }
    };

    const handleSendChatResponse = async (body, question) => {
        try {
           
            // handleGetChatResponse();
        } catch (error) {
            console.error('Failed to save chat:', error);
            setRequestError('Sorry, I could not save the response. Please try again.');
        } finally {
            setIsLoading(false);
            setInputValue('');
        }
    };

    const handleSendMessage = async () => {

        const trimmedPrompt = inputValue.trim();
        console.log(trimmedPrompt, "trimmedPrompt", (!trimmedPrompt || isLoading))
        if (!trimmedPrompt || isLoading) return;

        setIsLoading(true);
        setRequestError('');
        setLatestQuestion(trimmedPrompt);

        try {
            const data = await askQuestion(trimmedPrompt);
            console.log(data, ":data");

            const parsedResponse = parseResponse(data);
            setAiResponse(parsedResponse);
            handleSendChatResponse(data, trimmedPrompt);
        } catch (error) {
            setRequestError(error.message);
            setAiResponse('');
            setIsLoading(false);
            setInputValue('');
        }
    };

    const handleKeyDown = (e) => {
        // Handle suggestions navigation
        if (showSuggestions && filteredPrompts.length > 0) {
            if (e.key === 'ArrowDown') {
                e.preventDefault();
                setSelectedSuggestionIndex(prev =>
                    prev < filteredPrompts.length - 1 ? prev + 1 : prev
                );
                return;
            }

            if (e.key === 'ArrowUp') {
                e.preventDefault();
                setSelectedSuggestionIndex(prev => prev > 0 ? prev - 1 : -1);
                return;
            }

            if (e.key === 'Enter' && selectedSuggestionIndex >= 0) {
                e.preventDefault();
                handlePromptSelect(filteredPrompts[selectedSuggestionIndex]);
                return;
            }

            if (e.key === 'Escape') {
                e.preventDefault();
                setShowSuggestions(false);
                setSelectedSuggestionIndex(-1);
                return;
            }
        }

        // Handle Escape to cancel edit
        if (e.key === 'Escape' && editingMessageId === 'latest') {
            e.preventDefault();
            handleCancelEdit();
            return;
        }

        // Normal Enter to send message or save edit
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            if (editingMessageId === 'latest') {
                handleSaveEdit();
            } else {
                handleSendMessage();
            }
        }
    };

    const handleChange = (e) => {
        const value = e.target.value;
        setInputValue(value);

        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto';
            textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
        }

        // Filter prompts based on input (compare without placeholders)
        if (value.trim()) {
            const filtered = predefinedPrompts.filter(prompt => {
                const promptWithoutPlaceholders = removePlaceholdersForAPI(prompt);
                return promptWithoutPlaceholders.toLowerCase().includes(value.toLowerCase());
            });
            setFilteredPrompts(filtered);
            setShowSuggestions(filtered.length > 0);
            setSelectedSuggestionIndex(-1); // Reset selection when typing
        } else {
            setShowSuggestions(false);
            setFilteredPrompts([]);
            setSelectedSuggestionIndex(-1);
        }
    };

    const handleCopy = () => {
        navigator.clipboard.writeText(latestQuestion);
        setCopiedMessageId('latest');
        setTimeout(() => setCopiedMessageId(null), 2000);
    };

    const handleEdit = () => {
        setEditingMessageId('latest');
        setEditedText(latestQuestion);
        setInputValue(latestQuestion); // Set to input field
        if (textareaRef.current) {
            textareaRef.current.focus();
            textareaRef.current.style.height = 'auto';
            textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
        }
    };
    const handleSaveEdit = async () => {
        alert("edit")
        const trimmedText = inputValue.trim();
        if (!trimmedText) return;

        setEditingMessageId(null);
        setAiResponse(''); // Clear previous response
        setLatestQuestion(trimmedText);
        setIsLoading(true);
        setRequestError('');
        setInputValue('');

        try {
            const data = await askQuestion(trimmedText);
            console.log(data, ":data");

            const parsedResponse = parseResponse(data);
            setAiResponse(parsedResponse);
        } catch (error) {
            setRequestError(error.message);
            setAiResponse('');
        } finally {
            setIsLoading(false);
        }
    };

    const handleRetry = async () => {
        setIsLoading(true);
        setRequestError('');

        try {
            const data = await askQuestion(latestQuestion);
            console.log(data, ":data");

            const parsedResponse = parseResponse(data);
            setAiResponse(parsedResponse);
        } catch (error) {
            setRequestError(error.message);
            setAiResponse('');
        } finally {
            setIsLoading(false);
        }
    };

    const handleCancelEdit = () => {
        setEditingMessageId(null);
        setEditedText('');
        setInputValue(''); // Clear input field
    };

    const handlePromptSelect = (selectedPrompt) => {
        // Remove placeholders when setting input value
        setInputValue(convertPlaceholdersToEditable(selectedPrompt));
        setShowPromptModal(false);
        setShowSuggestions(false);
        setFilteredPrompts([]);
        setSelectedSuggestionIndex(-1);
        if (textareaRef.current) {
            textareaRef.current.focus();
            textareaRef.current.style.height = 'auto';
            textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
        }
    };





    // In handleDocumentDownload function, update to handle policies:

    const handleDocumentDownload = async (filename, isPolicyDoc = false) => {
        try {
            
            const downloadUrl =""

            const response = await fetch(downloadUrl);
            const blob = await response.blob();

            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = filename.split('/').pop(); // Extract just the filename
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(url);
        } catch (error) {
            console.error('Download failed:', error);
       
            const downloadUrl = ""
            window.open(downloadUrl, '_blank');
        }
    };

    const formatDate = (value) => {
        if (value === null || value === undefined) return '-';

        if (!value) return value;
        if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}/.test(value)) {
            const date = new Date(value);
            if (!isNaN(date.getTime())) {
                const day = String(date.getDate()).padStart(2, '0');
                const month = String(date.getMonth() + 1).padStart(2, '0');
                const year = date.getFullYear();
                return `${day}/${month}/${year}`;
            }
        }
        return value;
    };

    const formatKey = (key) => {
        return key
            .split('_')
            .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');
    };

    // Helper function to render nested array as a table
    const renderNestedTable = (arr, keyName) => {
        if (!Array.isArray(arr) || arr.length === 0) return null;

        // Check if array contains objects
        if (typeof arr[0] !== 'object' || arr[0] === null) {
            return arr.join(', ');
        }

        const columns = Object.keys(arr[0]);

        return (
            <div className="nested-table-container">
                <div className="nested-table-header">{formatKey(keyName)}</div>
                <table className="nested-table">
                    <thead>
                        <tr>
                            {columns.map((col) => (
                                <th key={col}>{formatKey(col)}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {arr.map((row, idx) => (
                            <tr key={idx}>
                                {columns.map((col) => {
                                    const formattedValue = formatDate(row[col]);
                                    return (
                                        <td key={col}>
                                            {formattedValue !== row[col]
                                                ? formattedValue
                                                : (typeof row[col] === 'string' || typeof row[col] === 'number'
                                                    ? row[col]
                                                    : JSON.stringify(row[col]))}
                                        </td>
                                    );
                                })}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        );
    };

    // Helper function to render cell value - handles nested arrays
    const renderCellValue = (value, key) => {
        if (value === null || value === undefined) return '-';

        // Handle nested arrays (like attendanceDetails)
        if (Array.isArray(value) && value.length > 0 && typeof value[0] === 'object') {
            return renderNestedTable(value, key);
        }

        // Handle simple arrays
        if (Array.isArray(value)) {
            return value.join(', ');
        }

        // Handle dates
        const formattedValue = formatDate(value);
        if (formattedValue !== value) {
            return formattedValue;
        }

        // Handle strings and numbers
        if (typeof value === 'string' || typeof value === 'number') {
            return value;
        }

        // Handle objects
        return JSON.stringify(value);
    };

    const renderResponse = (response) => {
        if (!response) return null;

        if (response.type === 'empty') {
            return <p className="no-data-message">No data found</p>;
        }

        // In renderResponse function, add this condition after the documents check:

        if (response.type === 'policies') {
            const data = response.content;
            if (!data || data?.length === 0) {
                return <p className="no-data-message">No data found</p>;
            }
            return (
                <div className="documents-grid">
                    {data.map((policy, idx) => (
                        <div key={idx} className="document-card">
                            <div className="document-icon">
                                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                                    <polyline points="14 2 14 8 20 8" />
                                </svg>
                            </div>
                            <div className="document-info">
                                <h4 className="document-type">{policy.policy_name}</h4>
                                <p className="document-filename">{policy.policy_file}</p>
                                <div className="document-meta">
                                </div>
                            </div>
                            <button
                                className="document-download-btn"
                                title="Download"
                                onClick={() => handleDocumentDownload(policy.policy_path, true)}
                            >
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                                    <polyline points="7 10 12 15 17 10" />
                                    <line x1="12" y1="15" x2="12" y2="3" />
                                </svg>
                            </button>
                        </div>
                    ))}
                </div>
            );
        }
        if (response.type === 'apihits') {
            const data = response.content;
            if (!data) {
                return <p className="no-data-message">{data?.error}</p>;
            }
            return (
                <div className="apihit-message">
                    <p>{data.message}</p>
                </div>
            );
        }

        if (response.type === 'documents') {
            const data = response.content;
            if (!data || data?.length === 0) {
                return <p className="no-data-message">No data found</p>;
            }
            return (
                <div className="documents-grid">
                    {data.map((doc, idx) => (
                        <div key={idx} className="document-card">
                            <div className="document-icon">
                                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                                    <polyline points="14 2 14 8 20 8" />
                                </svg>
                            </div>
                            <div className="document-info">
                                <h4 className="document-type">{doc.document_type}</h4>
                                <p className="document-filename">{doc.filename}</p>
                                <div className="document-meta">
                                    <span className="document-emp-code">{doc.emp_code}</span>
                                </div>
                            </div>
                            <button
                                className="document-download-btn"
                                title="Download"
                                onClick={() => handleDocumentDownload(doc.filename)}
                            >
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                                    <polyline points="7 10 12 15 17 10" />
                                    <line x1="12" y1="15" x2="12" y2="3" />
                                </svg>
                            </button>
                        </div>
                    ))}
                </div>
            );
        }

        if (response.type === 'table') {
            const data = response.content;
            const columns = Object.keys(data[0]);

            // Separate regular columns from nested array columns
            const regularColumns = columns.filter(col =>
                !Array.isArray(data[0][col]) ||
                data[0][col].length === 0 ||
                typeof data[0][col][0] !== 'object'
            );
            const nestedColumns = columns.filter(col =>
                Array.isArray(data[0][col]) &&
                data[0][col].length > 0 &&
                typeof data[0][col][0] === 'object'
            );

            return (
                <div className="response-table-container">
                    <table className="response-table">
                        <thead>
                            <tr>
                                {regularColumns.map((col) => (
                                    <th key={col}>{formatKey(col)}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {data.map((row, idx) => (
                                <React.Fragment key={idx}>
                                    <tr>
                                        {regularColumns.map((col) => (
                                            <td key={col}>{renderCellValue(row[col], col)}</td>
                                        ))}
                                    </tr>
                                    {/* Render nested arrays as expandable tables below */}
                                    {nestedColumns.length > 0 && (
                                        <tr className="nested-row">
                                            <td colSpan={regularColumns.length}>
                                                {nestedColumns.map((col) => (
                                                    <div key={col}>
                                                        {renderNestedTable(row[col], col)}
                                                    </div>
                                                ))}
                                            </td>
                                        </tr>
                                    )}
                                </React.Fragment>
                            ))}
                        </tbody>
                    </table>
                </div>
            );
        }

        if (response.type === 'list') {
            const data = response.content;
            return (
                <div className="response-list">
                    {Object.entries(data).map(([key, value]) => {
                        // Handle nested arrays (like attendanceDetails)
                        if (Array.isArray(value) && value.length > 0 && typeof value[0] === 'object') {
                            return (
                                <div key={key} className="list-item nested-list-item">
                                    {renderNestedTable(value, key)}
                                </div>
                            );
                        }

                        return (
                            <div key={key} className="list-item">
                                <strong>{formatKey(key)}:</strong>{' '}
                                {renderCellValue(value, key)}
                            </div>
                        );
                    })}
                </div>
            );
        }

        return <p>{response.content}</p>;
    };

    return (
        <div className="chatbot-page-container">
            <div className="chatbot-page-content">
                {/* Messages Area */}
                <div className="chatbot-messages-wrapper">
                    {chatHistory.length === 0 && !latestQuestion && !isLoading && !aiResponse && !requestError && (
                        <div className="chatbot-welcome">
                            <div className="welcome-icon">
                                <div className="ai-avatar-large">AI</div>
                            </div>
                            <h1 className="welcome-title">How can I help you today?</h1>
                            <p className="welcome-subtitle">
                                Ask me anything, and I'll do my best to assist you.
                            </p>
                        </div>
                    )}

                    {(chatHistory.length > 0 || latestQuestion || isLoading || aiResponse || requestError) && (
                        <div className="chatbot-messages-list">
                            {/* Chat History */}
                            {chatHistory.map((chat, index) => (
                                <div key={index}>
                                    <div className="chat-question">
                                        <p>{chat.question}</p>
                                    </div>
                                    <div className="chat-answer">
                                        {chat.response.type === 'empty' && <p className="no-data-message">No data found</p>}

                                        {chat.response.type === 'policies' && (
                                            <>
                                                {!chat.response.content || chat.response.content.length === 0 ? (
                                                    <p className="no-data-message">No data found</p>
                                                ) : (
                                                    <div className="documents-grid">
                                                        {chat.response.content.map((policy, idx) => (
                                                            <div key={idx} className="document-card">
                                                                <div className="document-icon">
                                                                    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                                                                        <polyline points="14 2 14 8 20 8" />
                                                                    </svg>
                                                                </div>
                                                                <div className="document-info">
                                                                    <h4 className="document-type">{policy.policy_name}</h4>
                                                                    <p className="document-filename">{policy.policy_file}</p>
                                                                    <div className="document-meta">
                                                                    </div>
                                                                </div>
                                                                <button
                                                                    className="document-download-btn"
                                                                    title="Download"
                                                                    onClick={() => handleDocumentDownload(policy.policy_path, true)}
                                                                >
                                                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                                                                        <polyline points="7 10 12 15 17 10" />
                                                                        <line x1="12" y1="15" x2="12" y2="3" />
                                                                    </svg>
                                                                </button>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </>
                                        )}
                                        {chat.response.type === 'apihits' && (
                                            <>
                                                {!chat.response.content ? (
                                                    <p className="no-data-message">No data found</p>
                                                ) : (
                                                    <div className="apihit-message">
                                                        <p>{chat.response.content.message}</p>
                                                    </div>
                                                )}
                                            </>
                                        )}

                                        {chat.response.type === 'documents' && (
                                            <>
                                                {!chat.response.content || chat.response.content.length === 0 ? (
                                                    <p className="no-data-message">No data found</p>
                                                ) : (
                                                    <div className="documents-grid">
                                                        {chat.response.content.map((doc, idx) => (
                                                            <div key={idx} className="document-card">
                                                                <div className="document-icon">
                                                                    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                                                                        <polyline points="14 2 14 8 20 8" />
                                                                    </svg>
                                                                </div>
                                                                <div className="document-info">
                                                                    <h4 className="document-type">{doc.document_type}</h4>
                                                                    <p className="document-filename">{doc.filename}</p>
                                                                    <div className="document-meta">
                                                                        <span className="document-emp-code">{doc.emp_code}</span>
                                                                    </div>
                                                                </div>
                                                                <button
                                                                    className="document-download-btn"
                                                                    title="Download"
                                                                    onClick={() => handleDocumentDownload(doc.filename)}
                                                                >
                                                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                                                                        <polyline points="7 10 12 15 17 10" />
                                                                        <line x1="12" y1="15" x2="12" y2="3" />
                                                                    </svg>
                                                                </button>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </>
                                        )}

                                        {chat.response.type === 'table' && (
                                            <div className="response-table-container">
                                                {(() => {
                                                    const columns = Object.keys(chat.response.content[0]);
                                                    const regularColumns = columns.filter(col =>
                                                        !Array.isArray(chat.response.content[0][col]) ||
                                                        chat.response.content[0][col].length === 0 ||
                                                        typeof chat.response.content[0][col][0] !== 'object'
                                                    );
                                                    const nestedColumns = columns.filter(col =>
                                                        Array.isArray(chat.response.content[0][col]) &&
                                                        chat.response.content[0][col].length > 0 &&
                                                        typeof chat.response.content[0][col][0] === 'object'
                                                    );
                                                    return (
                                                        <table className="response-table">
                                                            <thead>
                                                                <tr>
                                                                    {regularColumns.map((col) => (
                                                                        <th key={col}>{formatKey(col)}</th>
                                                                    ))}
                                                                </tr>
                                                            </thead>
                                                            <tbody>
                                                                {chat.response.content.map((row, idx) => (
                                                                    <React.Fragment key={idx}>
                                                                        <tr>
                                                                            {regularColumns.map((col) => (
                                                                                <td key={col}>{renderCellValue(row[col], col)}</td>
                                                                            ))}
                                                                        </tr>
                                                                        {nestedColumns.length > 0 && (
                                                                            <tr className="nested-row">
                                                                                <td colSpan={regularColumns.length}>
                                                                                    {nestedColumns.map((col) => (
                                                                                        <div key={col}>
                                                                                            {renderNestedTable(row[col], col)}
                                                                                        </div>
                                                                                    ))}
                                                                                </td>
                                                                            </tr>
                                                                        )}
                                                                    </React.Fragment>
                                                                ))}
                                                            </tbody>
                                                        </table>
                                                    );
                                                })()}
                                            </div>
                                        )}

                                        {chat.response.type === 'list' && (
                                            <div className="response-list">
                                                {Object.entries(chat.response.content).map(([key, value]) => {
                                                    // Handle nested arrays (like attendanceDetails)
                                                    if (Array.isArray(value) && value.length > 0 && typeof value[0] === 'object') {
                                                        return (
                                                            <div key={key} className="list-item nested-list-item">
                                                                {renderNestedTable(value, key)}
                                                            </div>
                                                        );
                                                    }

                                                    return (
                                                        <div key={key} className="list-item">
                                                            <strong>{formatKey(key)}:</strong> {renderCellValue(value, key)}
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        )}

                                        {chat.response.type === 'text' && <p>{chat.response.content}</p>}
                                    </div>
                                </div>
                            ))}

                            {/* Latest Question */}
                            {/* Latest Question */}
                            {latestQuestion && (
                                <div className="chat-question">
                                    {editingMessageId === 'latest' ? (
                                        <div className="editing-indicator">
                                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                                                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                                            </svg>
                                            <span>Editing message...</span>
                                        </div>
                                    ) : (
                                        <>
                                            <p>{latestQuestion}</p>
                                            <div className="message-actions">
                                                <button
                                                    className="action-icon"
                                                    onClick={handleCopy}
                                                    title={copiedMessageId === 'latest' ? 'Copied!' : 'Copy'}
                                                >
                                                    {copiedMessageId === 'latest' ? (
                                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                            <polyline points="20 6 9 17 4 12" />
                                                        </svg>
                                                    ) : (
                                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                            <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                                                            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                                                        </svg>
                                                    )}
                                                </button>
                                                <button className="action-icon" onClick={handleEdit} title="Edit">
                                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                                                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                                                    </svg>
                                                </button>
                                            </div>
                                        </>
                                    )}
                                </div>
                            )}

                            {/* Loading State */}
                            {isLoading && (
                                <div className="chat-status">
                                    <div className="chat-spinner" />
                                    <p>Thinking...</p>
                                </div>
                            )}

                            {/* AI Response */}
                            {aiResponse && !isLoading && (
                                <div className="chat-answer">
                                    {renderResponse(aiResponse)}
                                </div>
                            )}

                            {/* Error State */}
                            {requestError && !isLoading && (
                                <div className="chat-error">
                                    <p>{requestError}</p>
                                    <button className="retry-button" onClick={handleRetry} title="Retry">
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <polyline points="23 4 23 10 17 10" />
                                            <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
                                        </svg>
                                    </button>
                                </div>
                            )}

                            <div ref={messagesEndRef} />
                        </div>
                    )}
                </div>

                {/* Input Area */}
                <div className="chatbot-input-area">
                    <div className="input-wrapper">
                        {/* Suggestions Dropdown */}
                        {showSuggestions && filteredPrompts.length > 0 && (
                            <div className="suggestions-dropdown" ref={suggestionsRef}>
                                {filteredPrompts.map((prompt, index) => (
                                    <div
                                        key={index}
                                        className={`suggestion-item ${index === selectedSuggestionIndex ? 'selected' : ''}`}
                                        onClick={() => handlePromptSelect(prompt)}
                                        onMouseEnter={() => setSelectedSuggestionIndex(index)}
                                    >
                                        {renderHighlightedText(prompt)}
                                    </div>
                                ))}
                            </div>
                        )}

                        <textarea
                            ref={textareaRef}
                            className="prompt-input"
                            placeholder="Type your message here..."
                            value={inputValue}
                            onChange={handleChange}
                            onKeyDown={handleKeyDown}
                            rows="1"
                        />
                        <button
                            className="prompt-button"
                            onClick={() => setShowPromptModal(true)}
                            title="Select a prompt"
                            type="button"
                        >
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M12 20h9" />
                                <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
                            </svg>
                        </button>
                        {inputValue.trim() && (
                            <button
                                className="send-button"
                                onClick={editingMessageId === 'latest' ? handleSaveEdit : handleSendMessage}
                                title={editingMessageId === 'latest' ? 'Save Edit' : 'Send Message'}
                            >
                                {editingMessageId === 'latest' ? (
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <polyline points="20 6 9 17 4 12" />
                                    </svg>
                                ) : (
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <line x1="22" y1="2" x2="11" y2="13" />
                                        <polygon points="22 2 15 22 11 13 2 9 22 2" />
                                    </svg>
                                )}
                            </button>
                        )}
                        {inputValue.trim() && editingMessageId === 'latest' && (
                            <button
                                className="cancel-edit-button"
                                onClick={handleCancelEdit}
                                title="Cancel Edit"
                            >
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <line x1="18" y1="6" x2="6" y2="18" />
                                    <line x1="6" y1="6" x2="18" y2="18" />
                                </svg>
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* Prompt Modal */}
            {showPromptModal && (
                <div className="chatbot-prompt-modal-overlay" onClick={() => setShowPromptModal(false)}>
                    <div className="chatbot-prompt-modal" onClick={(e) => e.stopPropagation()}>
                        <div className="chatbot-prompt-modal-header">
                            <h3>Select a Prompt</h3>
                            <button className="chatbot-modal-close" onClick={() => setShowPromptModal(false)}>
                                ×
                            </button>
                        </div>
                        <div className="chatbot-prompt-list">
                            {predefinedPrompts.map((prompt, index) => (
                                <button
                                    key={index}
                                    className="chatbot-prompt-item"
                                    onClick={() => handlePromptSelect(prompt)}
                                >
                                    {renderHighlightedText(prompt)}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default MiraAI;

