import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Settings, MessageSquare, Code, HeartHandshake, Edit2, Check, X, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAuth } from '@/contexts/AuthContext';

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'bot';
  timestamp: Date;
}

interface ChatMode {
  id: string;
  name: string;
  icon: React.ReactNode;
  prompt: string;
  color: string;
}

const ChatInterface = () => {
  const { user, signOut } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedMode, setSelectedMode] = useState('general');
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const API_KEY = "AIzaSyClhA0IupF8uw_Da4yUNtJiLC96oS8DJQE";
  const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${API_KEY}`;

  const chatModes: ChatMode[] = [
    {
      id: 'general',
      name: 'General Assistant',
      icon: <MessageSquare className="w-4 h-4" />,
      prompt: "You are a friendly, helpful, and knowledgeable AI chatbot. You speak in clear and polite language. Always try to understand the user's intent and provide accurate, concise answers. If the user asks vague or confusing questions, politely ask clarifying questions. If the topic is sensitive or private, respond with care. Keep your tone warm, professional, and never rude. If you don't know something, admit it honestly instead of guessing. For general queries, include examples or step-by-step guidance when helpful. Always end your responses by asking if the user needs more help.",
      color: 'bg-blue-500'
    },
    {
      id: 'developer',
      name: 'Developer Assistant (Hindi)',
      icon: <Code className="w-4 h-4" />,
      prompt: "Tum ek AI assistant ho jo Hindi mein friendly aur asaan bhasha mein developers ko madad karta hai. Tumhara goal hai ki users ko code samajhne, likhne, ya troubleshoot karne mein help mile. Tum hamesha clear examples ke saath answer dete ho, aur agar user confuse ho to tum politely clarification maangte ho. Tum kabhi galat info guess nahi karte – agar kuch nahi pata ho to clearly bolte ho. Har response ke end mein puchte ho: 'Kya aapko aur madad chahiye?'",
      color: 'bg-green-500'
    },
    {
      id: 'support',
      name: 'Customer Support',
      icon: <HeartHandshake className="w-4 h-4" />,
      prompt: "You are a customer support chatbot for Concise Chat Assist. Your job is to help users with their questions about our AI chatbot service, features, and troubleshooting. Be polite, concise, and always follow best practices. If a user's issue is outside your scope, guide them to contact human support. Always greet the user, summarize their question, provide a solution, and ask if their issue is resolved.",
      color: 'bg-purple-500'
    }
  ];

  const currentMode = chatModes.find(mode => mode.id === selectedMode) || chatModes[0];

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    // Add welcome message when mode changes
    const welcomeMessage: Message = {
      id: Date.now().toString(),
      text: `Hello! I'm your ${currentMode.name}. How can I help you today?`,
      sender: 'bot',
      timestamp: new Date()
    };
    setMessages([welcomeMessage]);
  }, [selectedMode]);

  const startEditing = (messageId: string, currentText: string) => {
    setEditingMessageId(messageId);
    setEditingText(currentText);
  };

  const cancelEditing = () => {
    setEditingMessageId(null);
    setEditingText('');
  };

  const saveEdit = async (messageId: string) => {
    if (!editingText.trim()) return;

    // Update the message in the state
    setMessages(prev => prev.map(msg => 
      msg.id === messageId 
        ? { ...msg, text: editingText }
        : msg
    ));

    // Find the edited message and all messages after it
    const messageIndex = messages.findIndex(msg => msg.id === messageId);
    const messagesBeforeEdit = messages.slice(0, messageIndex + 1);
    
    // Update the edited message
    messagesBeforeEdit[messageIndex] = {
      ...messagesBeforeEdit[messageIndex],
      text: editingText
    };

    // Remove all bot responses after the edited message
    const updatedMessages = messagesBeforeEdit.filter((msg, index) => {
      if (index <= messageIndex) return true;
      return msg.sender === 'user';
    });

    setMessages(updatedMessages);
    setEditingMessageId(null);
    setEditingText('');
    setIsLoading(true);

    // Generate new response based on edited message
    try {
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: `${currentMode.prompt}\n\nUser: ${editingText}`
                }
              ]
            }
          ]
        })
      });

      if (!response.ok) {
        throw new Error('Failed to get response from AI');
      }

      const data = await response.json();
      const botResponse = data.candidates?.[0]?.content?.parts?.[0]?.text || 'Sorry, I couldn\'t generate a response. Please try again.';

      const botMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: botResponse,
        sender: 'bot',
        timestamp: new Date()
      };

      setMessages(prev => [...prev, botMessage]);
    } catch (error) {
      console.error('Error sending message:', error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: 'Sorry, I encountered an error. Please try again later.',
        sender: 'bot',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const sendMessage = async () => {
    if (!inputValue.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      text: inputValue,
      sender: 'user',
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);

    try {
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: `${currentMode.prompt}\n\nUser: ${inputValue}`
                }
              ]
            }
          ]
        })
      });

      if (!response.ok) {
        throw new Error('Failed to get response from AI');
      }

      const data = await response.json();
      const botResponse = data.candidates?.[0]?.content?.parts?.[0]?.text || 'Sorry, I couldn\'t generate a response. Please try again.';

      const botMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: botResponse,
        sender: 'bot',
        timestamp: new Date()
      };

      setMessages(prev => [...prev, botMessage]);
    } catch (error) {
      console.error('Error sending message:', error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: 'Sorry, I encountered an error. Please try again later.',
        sender: 'bot',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="flex flex-col h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Header */}
      <div className="bg-white shadow-sm border-b px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className={`p-2 rounded-lg ${currentMode.color} text-white`}>
              <Bot className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-gray-900">Concise Chat Assist</h1>
              <p className="text-sm text-gray-500">AI-Powered Chat Assistant</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-3">
            <Badge variant="outline" className="flex items-center space-x-1">
              {currentMode.icon}
              <span>{currentMode.name}</span>
            </Badge>
            <Select value={selectedMode} onValueChange={setSelectedMode}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Chat Mode" />
              </SelectTrigger>
              <SelectContent>
                {chatModes.map((mode) => (
                  <SelectItem key={mode.id} value={mode.id}>
                    <div className="flex items-center space-x-2">
                      {mode.icon}
                      <span>{mode.name}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            {/* User Profile and Logout */}
            <div className="flex items-center space-x-2">
              <Avatar className="w-8 h-8">
                <AvatarFallback>
                  {user?.email?.charAt(0).toUpperCase() || 'U'}
                </AvatarFallback>
              </Avatar>
              <Button
                variant="ghost"
                size="sm"
                onClick={signOut}
                className="text-gray-600 hover:text-gray-800"
              >
                <LogOut className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Chat Messages */}
      <ScrollArea className="flex-1 px-6 py-4">
        <div className="space-y-4 max-w-4xl mx-auto">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`flex items-start space-x-3 max-w-[80%] ${
                  message.sender === 'user' ? 'flex-row-reverse space-x-reverse' : ''
                }`}
              >
                <div
                  className={`p-2 rounded-full ${
                    message.sender === 'user'
                      ? 'bg-blue-500 text-white'
                      : `${currentMode.color} text-white`
                  }`}
                >
                  {message.sender === 'user' ? (
                    <User className="w-4 h-4" />
                  ) : (
                    <Bot className="w-4 h-4" />
                  )}
                </div>
                
                <div className="flex flex-col space-y-2">
                  <Card
                    className={`${
                      message.sender === 'user'
                        ? 'bg-blue-500 text-white border-blue-500'
                        : 'bg-white'
                    }`}
                  >
                    <CardContent className="p-3">
                      {editingMessageId === message.id ? (
                        <div className="space-y-2">
                          <Textarea
                            value={editingText}
                            onChange={(e) => setEditingText(e.target.value)}
                            className="min-h-[60px] text-sm bg-white text-black border-gray-300"
                            autoFocus
                          />
                          <div className="flex space-x-2">
                            <Button
                              size="sm"
                              onClick={() => saveEdit(message.id)}
                              disabled={!editingText.trim()}
                            >
                              <Check className="w-3 h-3" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={cancelEditing}
                            >
                              <X className="w-3 h-3" />
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <p className="text-sm whitespace-pre-wrap">{message.text}</p>
                          <div className="flex items-center justify-between mt-2">
                            <p
                              className={`text-xs ${
                                message.sender === 'user' ? 'text-blue-100' : 'text-gray-500'
                              }`}
                            >
                              {message.timestamp.toLocaleTimeString()}
                            </p>
                            {message.sender === 'user' && (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => startEditing(message.id, message.text)}
                                className={`h-6 w-6 p-0 ${
                                  message.sender === 'user' 
                                    ? 'text-blue-100 hover:text-white hover:bg-blue-600' 
                                    : 'text-gray-500 hover:text-gray-700'
                                }`}
                              >
                                <Edit2 className="w-3 h-3" />
                              </Button>
                            )}
                          </div>
                        </>
                      )}
                    </CardContent>
                  </Card>
                </div>
              </div>
            </div>
          ))}
          
          {isLoading && (
            <div className="flex justify-start">
              <div className="flex items-start space-x-3">
                <div className={`p-2 rounded-full ${currentMode.color} text-white`}>
                  <Bot className="w-4 h-4" />
                </div>
                <Card className="bg-white">
                  <CardContent className="p-3">
                    <div className="flex items-center space-x-2">
                      <div className="flex space-x-1">
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                      </div>
                      <span className="text-sm text-gray-500">Thinking...</span>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>

      {/* Input Area */}
      <div className="bg-white border-t px-6 py-4">
        <div className="max-w-4xl mx-auto">
          <div className="flex space-x-3">
            <Input
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder={`Message your ${currentMode.name.toLowerCase()}...`}
              className="flex-1"
              disabled={isLoading}
            />
            <Button
              onClick={sendMessage}
              disabled={!inputValue.trim() || isLoading}
              className="px-6"
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
          <p className="text-xs text-gray-500 mt-2 text-center">
            AI responses may vary. Please verify important information.
          </p>
        </div>
      </div>
    </div>
  );
};

export default ChatInterface;
