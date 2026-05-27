// frontend/src/pages/Dashboard.jsx
import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

export default function Dashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ title: '', description: '', code: '', language: 'javascript' });
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    fetchReviews();
  }, []);

  const fetchReviews = async () => {
    try {
      const { data } = await axios.get('/api/reviews');
      setReviews(data);
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  const createReview = async () => {
    setCreating(true);
    try {
      const { data } = await axios.post('/api/reviews', form);
      setReviews(prev => [data, ...prev]);
      setShowModal(false);
      setForm({ title: '', description: '', code: '', language: 'javascript' });
    } catch (err) {
      alert(err.response?.data?.message || 'Error creating review');
    }
    setCreating(false);
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const deleteReview = async (id, e) => {
    e.stopPropagation();
    if (!window.confirm('Are you sure you want to delete this review?')) return;
    try {
      await axios.delete(`/api/reviews/${id}`);
      setReviews(prev => prev.filter(r => r._id !== id));
    } catch (err) {
      alert('Error deleting review: ' + (err.response?.data?.message || err.message));
      console.error(err);
    }
  };

  const statusColors = {
    open: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    in_review: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
    approved: 'bg-green-500/10 text-green-400 border-green-500/20',
    changes_requested: 'bg-red-500/10 text-red-400 border-red-500/20',
  };

  const stats = {
    total: reviews.length,
    open: reviews.filter(r => r.status === 'open').length,
    approved: reviews.filter(r => r.status === 'approved').length,
    inReview: reviews.filter(r => r.status === 'in_review').length,
  };

  return (
    <div className="min-h-screen bg-gray-950 text-white">

      {/* Navbar */}
      <nav className="bg-gray-900 border-b border-gray-800 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-blue-500 rounded-lg flex items-center justify-center">
              <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
              </svg>
            </div>
            <span className="font-bold text-lg tracking-tight">DevCollab</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-gray-400 text-sm">
              Hey, <span className="text-white font-medium">{user?.name}</span>
            </span>
            <span className="bg-gray-800 text-gray-300 text-xs px-2.5 py-1 rounded-full border border-gray-700">
              {user?.role}
            </span>
            <button
              onClick={handleLogout}
              className="text-gray-400 hover:text-white text-sm transition"
            >
              Logout
            </button>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-6 py-8">

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[
            { label: 'Total Reviews', value: stats.total, color: 'text-white' },
            { label: 'Open', value: stats.open, color: 'text-blue-400' },
            { label: 'In Review', value: stats.inReview, color: 'text-yellow-400' },
            { label: 'Approved', value: stats.approved, color: 'text-green-400' },
          ].map(stat => (
            <div key={stat.label} className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
              <p className="text-gray-500 text-xs font-medium mb-1">{stat.label}</p>
              <p className={`text-3xl font-bold ${stat.color}`}>{stat.value}</p>
            </div>
          ))}
        </div>

        {/* Header Row */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-xl font-bold">Code Reviews</h1>
          {user?.role === 'developer' && (
            <button
              onClick={() => setShowModal(true)}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 px-4 py-2.5 rounded-xl text-sm font-medium transition"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              New Review
            </button>
          )}
        </div>

        {/* Reviews List */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <svg className="animate-spin w-8 h-8 text-blue-500" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
            </svg>
          </div>
        ) : reviews.length === 0 ? (
          <div className="text-center py-20 bg-gray-900 border border-gray-800 rounded-2xl">
            <svg className="w-12 h-12 text-gray-600 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
            </svg>
            <p className="text-gray-400 font-medium">No reviews yet</p>
            <p className="text-gray-600 text-sm mt-1">Create your first code review</p>
          </div>
        ) : (
          <div className="space-y-3">
            {reviews.map(review => (
              <div
                key={review._id}
                onClick={() => navigate(`/review/${review._id}`)}
                className="bg-gray-900 border border-gray-800 hover:border-gray-600 rounded-2xl p-5 cursor-pointer transition-all group"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-semibold text-white group-hover:text-blue-400 transition truncate">
                        {review.title}
                      </h3>
                      <span className={`shrink-0 text-xs px-2.5 py-0.5 rounded-full border font-medium ${statusColors[review.status]}`}>
                        {review.status.replace('_', ' ')}
                      </span>
                    </div>
                    {review.description && (
                      <p className="text-gray-500 text-sm truncate">{review.description}</p>
                    )}
                    <div className="flex items-center gap-4 mt-3 text-xs text-gray-600">
                      <span>By {review.owner?.name}</span>
                      <span className="bg-gray-800 px-2 py-0.5 rounded font-mono">{review.language}</span>
                      <span>{review.comments?.length || 0} comments</span>
                      <span>{new Date(review.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {user?.role === 'admin' && (
                      <button
                        onClick={(e) => deleteReview(review._id, e)}
                        className="p-1.5 text-gray-500 hover:text-red-400 hover:bg-red-500/10 rounded transition"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    )}
                    <svg className="w-5 h-5 text-gray-600 group-hover:text-gray-400 shrink-0 transition" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create Review Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 w-full max-w-lg">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold">New Code Review</h2>
              <button onClick={() => setShowModal(false)} className="text-gray-500 hover:text-white transition">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-gray-400 text-xs font-medium mb-1.5 block">Title *</label>
                <input
                  placeholder="e.g. Auth middleware refactor"
                  value={form.title}
                  onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
                  className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-white text-sm placeholder-gray-500 focus:outline-none focus:border-blue-500 transition"
                />
              </div>

              <div>
                <label className="text-gray-400 text-xs font-medium mb-1.5 block">Description</label>
                <input
                  placeholder="What should reviewers focus on?"
                  value={form.description}
                  onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
                  className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-white text-sm placeholder-gray-500 focus:outline-none focus:border-blue-500 transition"
                />
              </div>

              <div>
                <label className="text-gray-400 text-xs font-medium mb-1.5 block">Language</label>
                <select
                  value={form.language}
                  onChange={e => setForm(p => ({ ...p, language: e.target.value }))}
                  className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-blue-500 transition"
                >
                  {['javascript', 'typescript', 'python', 'java', 'cpp', 'go', 'rust'].map(l => (
                    <option key={l} value={l}>{l}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-gray-400 text-xs font-medium mb-1.5 block">Code *</label>
                <textarea
                  placeholder="Paste your code here..."
                  value={form.code}
                  onChange={e => setForm(p => ({ ...p, code: e.target.value }))}
                  rows={8}
                  className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white text-sm placeholder-gray-500 focus:outline-none focus:border-blue-500 transition font-mono resize-none"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-5">
              <button
                onClick={() => setShowModal(false)}
                className="flex-1 bg-gray-800 hover:bg-gray-700 text-gray-300 py-2.5 rounded-xl text-sm font-medium transition"
              >
                Cancel
              </button>
              <button
                onClick={createReview}
                disabled={creating || !form.title || !form.code}
                className="flex-1 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white py-2.5 rounded-xl text-sm font-medium transition"
              >
                {creating ? 'Creating...' : 'Create Review'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}