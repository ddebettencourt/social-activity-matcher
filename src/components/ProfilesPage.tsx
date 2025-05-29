'use client';

import React, { useState, useEffect } from 'react';
import { getAllUsersWithProfiles } from '@/lib/database';
import { generateProfileSummary, generateCopyableProfileSummary, ProfileSummary } from '@/lib/profileAnalysis';

interface UserProfile {
  username: string;
  createdAt: string;
  lastActive: string;
  totalMatchups: number;
  hasQuizData: boolean;
  isSelected: boolean;
  profileSummary?: ProfileSummary;
}

interface ProfilesPageProps {
  onBackToSplash?: () => void;
}

export default function ProfilesPage({ onBackToSplash }: ProfilesPageProps = {}) {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [copyableText, setCopyableText] = useState('');
  const [showCopyableText, setShowCopyableText] = useState(false);
  const [filter, setFilter] = useState<'all' | 'with-data' | 'no-data'>('all');

  // Load all users on component mount
  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    setIsLoading(true);
    try {
      const usersData = await getAllUsersWithProfiles();
      const userProfiles: UserProfile[] = usersData.map(user => ({
        username: user.username,
        createdAt: user.createdAt,
        lastActive: user.lastActive,
        totalMatchups: user.totalMatchups,
        hasQuizData: user.hasQuizData,
        isSelected: false
      }));
      setUsers(userProfiles);
    } catch (error) {
      console.error('Error loading users:', error);
    }
    setIsLoading(false);
  };

  // Toggle user selection
  const toggleUserSelection = (username: string) => {
    setUsers(prev => prev.map(user => 
      user.username === username 
        ? { ...user, isSelected: !user.isSelected }
        : user
    ));
  };

  // Select all users (with optional filter)
  const selectAll = (onlyWithData: boolean = false) => {
    setUsers(prev => prev.map(user => ({
      ...user,
      isSelected: onlyWithData ? user.hasQuizData : true
    })));
  };

  // Deselect all users
  const deselectAll = () => {
    setUsers(prev => prev.map(user => ({ ...user, isSelected: false })));
  };

  // Generate copyable summary for selected users
  const generateSummary = async () => {
    const selectedUsers = users.filter(user => user.isSelected);
    if (selectedUsers.length === 0) {
      alert('Please select at least one user to generate a summary.');
      return;
    }

    setIsGenerating(true);
    try {
      // Get full profile data for selected users
      const usersData = await getAllUsersWithProfiles();
      const profileSummaries: ProfileSummary[] = [];

      for (const selectedUser of selectedUsers) {
        const fullUserData = usersData.find(u => u.username === selectedUser.username);
        if (fullUserData) {
          const profileSummary = generateProfileSummary(
            fullUserData.username,
            fullUserData.activityData,
            fullUserData.totalMatchups
          );
          profileSummaries.push(profileSummary);
        }
      }

      const copyableText = generateCopyableProfileSummary(profileSummaries);
      setCopyableText(copyableText);
      setShowCopyableText(true);
    } catch (error) {
      console.error('Error generating summary:', error);
      alert('Error generating summary. Please try again.');
    }
    setIsGenerating(false);
  };

  // Copy text to clipboard
  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(copyableText);
      alert('Profile summary copied to clipboard!');
    } catch (error) {
      console.error('Error copying to clipboard:', error);
      alert('Error copying to clipboard. Please select and copy manually.');
    }
  };

  // Filter users based on selected filter
  const filteredUsers = users.filter(user => {
    switch (filter) {
      case 'with-data':
        return user.hasQuizData;
      case 'no-data':
        return !user.hasQuizData;
      default:
        return true;
    }
  });

  const selectedCount = users.filter(u => u.isSelected).length;
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 p-8">
        <div className="max-w-6xl mx-auto">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading user profiles...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          {onBackToSplash && (
            <div className="flex justify-start mb-4">
              <button
                onClick={onBackToSplash}
                className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
              >
                ← Back to Home
              </button>
            </div>
          )}
          <h1 className="text-4xl font-bold text-gray-800 mb-2">Profile Manager</h1>
          <p className="text-xl text-gray-600">Select users to generate detailed profile summaries</p>
        </div>

        {/* Filter and Selection Controls */}
        <div className="bg-white rounded-xl shadow-md p-6 mb-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <label className="text-gray-700 font-medium">Filter:</label>
              <select
                value={filter}
                onChange={(e) => setFilter(e.target.value as typeof filter)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">All Users ({users.length})</option>
                <option value="with-data">With Quiz Data ({users.filter(u => u.hasQuizData).length})</option>
                <option value="no-data">No Quiz Data ({users.filter(u => !u.hasQuizData).length})</option>
              </select>
            </div>

            <div className="flex items-center gap-3">
              <span className="text-gray-600">
                {selectedCount} selected
              </span>
              <button
                onClick={() => selectAll(false)}
                className="px-3 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors"
              >
                Select All
              </button>
              <button
                onClick={() => selectAll(true)}
                className="px-3 py-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors"
              >
                Select Data Only
              </button>
              <button
                onClick={deselectAll}
                className="px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Deselect All
              </button>
              <button
                onClick={generateSummary}
                disabled={selectedCount === 0 || isGenerating}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors font-medium"
              >
                {isGenerating ? 'Generating...' : 'Generate Summary'}
              </button>
            </div>
          </div>
        </div>

        {/* User List */}
        <div className="bg-white rounded-xl shadow-md overflow-hidden">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-2xl font-bold text-gray-800">Users ({filteredUsers.length})</h2>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Select
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Username
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Quiz Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Matchups
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Created
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Last Active
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredUsers.map((user) => (
                  <tr
                    key={user.username}
                    className={`hover:bg-gray-50 transition-colors ${user.isSelected ? 'bg-blue-50' : ''}`}
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <input
                        type="checkbox"
                        checked={user.isSelected}
                        onChange={() => toggleUserSelection(user.username)}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded cursor-pointer"
                      />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="font-medium text-gray-900">{user.username}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        user.hasQuizData 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {user.hasQuizData ? 'Completed' : 'No Data'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-gray-900">
                      {user.hasQuizData ? user.totalMatchups : '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-gray-500">
                      {formatDate(user.createdAt)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-gray-500">
                      {formatDate(user.lastActive)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {filteredUsers.length === 0 && (
            <div className="text-center py-12">
              <p className="text-gray-500">No users match the current filter.</p>
            </div>
          )}
        </div>

        {/* Copyable Text Modal */}
        {showCopyableText && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[80vh] flex flex-col">
              <div className="p-6 border-b border-gray-200 flex items-center justify-between">
                <h2 className="text-2xl font-bold text-gray-800">Profile Summary</h2>
                <div className="flex gap-3">
                  <button
                    onClick={copyToClipboard}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
                  >
                    Copy to Clipboard
                  </button>
                  <button
                    onClick={() => setShowCopyableText(false)}
                    className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                  >
                    Close
                  </button>
                </div>
              </div>
              
              <div className="flex-1 overflow-auto p-6">
                <textarea
                  value={copyableText}
                  readOnly
                  className="w-full h-full min-h-[400px] font-mono text-sm bg-gray-50 border border-gray-300 rounded-lg p-4 resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  style={{ whiteSpace: 'pre' }}
                />
              </div>
              
              <div className="p-4 border-t border-gray-200 text-center text-gray-600">
                <p>Select all text (Ctrl+A / Cmd+A) to copy manually if clipboard doesn&apos;t work</p>
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="text-center mt-8 text-gray-500">
          <p>© 2025</p>
        </div>
      </div>
    </div>
  );
}