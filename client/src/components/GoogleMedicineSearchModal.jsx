import React, { useState, useEffect } from 'react';
import { searchMedicineGoogle } from '../services/api';
import {
  Search,
  ExternalLink,
  X,
  Pill,
  AlertTriangle,
  Info,
  BookOpen,
  ShieldCheck,
  Globe,
  Clock,
  Sparkles,
  RefreshCw,
  FileText,
  HeartPulse
} from 'lucide-react';

const GoogleMedicineSearchModal = ({ isOpen, onClose, initialQuery = '' }) => {
  const [query, setQuery] = useState(initialQuery);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [searchData, setSearchData] = useState(null);

  useEffect(() => {
    if (isOpen) {
      const cleanInitial = (initialQuery || '').trim();
      setQuery(cleanInitial);
      if (cleanInitial) {
        performSearch(cleanInitial);
      } else {
        setSearchData(null);
        setError('');
      }
    }
  }, [isOpen, initialQuery]);

  const performSearch = async (searchTerm) => {
    const q = (searchTerm || query || '').trim();
    if (!q) {
      setError('Please enter a medicine name to search.');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const response = await searchMedicineGoogle(q);
      if (response.data && response.data.success) {
        setSearchData(response.data);
      } else {
        setError(response.data?.message || 'No search results found for this medicine.');
      }
    } catch (err) {
      console.error('Medicine Google Search error:', err);
      setError(err.response?.data?.message || 'Failed to fetch medicine information from Google Search API.');
    } finally {
      setLoading(false);
    }
  };

  const handleFormSubmit = (e) => {
    e.preventDefault();
    performSearch(query);
  };

  if (!isOpen) return null;

  return (
    <div
      id="google-medicine-search-overlay"
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.65)',
        backdropFilter: 'blur(6px)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
        animation: 'fadeIn 0.2s ease-out'
      }}
      onClick={(e) => {
        if (e.target.id === 'google-medicine-search-overlay') onClose();
      }}
    >
      <div
        id="google-medicine-search-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="medicine-modal-title"
        style={{
          backgroundColor: '#ffffff',
          borderRadius: '16px',
          width: '100%',
          maxWidth: '740px',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25), 0 0 0 1px rgba(226, 232, 240, 0.8)',
          overflow: 'hidden',
          animation: 'scaleUp 0.2s ease-out'
        }}
      >
        {/* MODAL HEADER */}
        <div
          style={{
            padding: '18px 24px',
            borderBottom: '1px solid #e2e8f0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '42px',
                height: '42px',
                borderRadius: '10px',
                backgroundColor: '#eff6ff',
                border: '1px solid #bfdbfe',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#2563eb'
              }}
            >
              {/* Google stylized G icon or Pill + Search */}
              <svg width="22" height="22" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
            </div>
            <div>
              <h3
                id="medicine-modal-title"
                style={{
                  fontSize: '17px',
                  fontWeight: '700',
                  color: '#0f172a',
                  margin: 0,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
              >
                Medicine Information & Usage
                <span
                  style={{
                    fontSize: '11px',
                    fontWeight: '600',
                    backgroundColor: '#e0f2fe',
                    color: '#0369a1',
                    padding: '2px 8px',
                    borderRadius: '12px',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                >
                  <Sparkles size={11} /> Google Verified
                </span>
              </h3>
              <p style={{ fontSize: '12px', color: '#64748b', margin: '2px 0 0 0' }}>
                Instant clinical indications, dosage guidelines, side effects & peer-reviewed sources
              </p>
            </div>
          </div>

          <button
            id="close-google-search-modal-btn"
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              padding: '8px',
              borderRadius: '8px',
              cursor: 'pointer',
              color: '#64748b',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.15s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#e2e8f0';
              e.currentTarget.style.color = '#0f172a';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
              e.currentTarget.style.color = '#64748b';
            }}
            title="Close modal"
          >
            <X size={20} />
          </button>
        </div>

        {/* SEARCH BAR INPUT */}
        <div
          style={{
            padding: '16px 24px',
            borderBottom: '1px solid #f1f5f9',
            backgroundColor: '#ffffff'
          }}
        >
          <form onSubmit={handleFormSubmit} style={{ display: 'flex', gap: '10px' }}>
            <div style={{ position: 'relative', flex: 1 }}>
              <div
                style={{
                  position: 'absolute',
                  left: '14px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: '#94a3b8',
                  pointerEvents: 'none',
                  display: 'flex',
                  alignItems: 'center'
                }}
              >
                <Search size={18} />
              </div>
              <input
                id="medicine-google-search-input"
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search any medicine name (e.g. Paracetamol, Amoxicillin, Metformin)..."
                style={{
                  width: '100%',
                  padding: '11px 16px 11px 42px',
                  borderRadius: '10px',
                  border: '1.5px solid #cbd5e1',
                  fontSize: '14px',
                  color: '#0f172a',
                  outline: 'none',
                  boxSizing: 'border-box',
                  transition: 'border-color 0.2s ease, box-shadow 0.2s ease'
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = '#3b82f6';
                  e.target.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.15)';
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = '#cbd5e1';
                  e.target.style.boxShadow = 'none';
                }}
              />
            </div>
            <button
              id="submit-medicine-search-btn"
              type="submit"
              disabled={loading}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                backgroundColor: '#2563eb',
                color: '#ffffff',
                border: 'none',
                padding: '0 20px',
                borderRadius: '10px',
                fontSize: '14px',
                fontWeight: '600',
                cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.7 : 1,
                transition: 'background-color 0.15s ease'
              }}
              onMouseEnter={(e) => {
                if (!loading) e.currentTarget.style.backgroundColor = '#1d4ed8';
              }}
              onMouseLeave={(e) => {
                if (!loading) e.currentTarget.style.backgroundColor = '#2563eb';
              }}
            >
              {loading ? <RefreshCw size={16} className="animate-spin" /> : <Search size={16} />}
              <span>{loading ? 'Searching...' : 'Search'}</span>
            </button>
          </form>

          {/* Quick medicine suggestion pills */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              marginTop: '10px',
              flexWrap: 'wrap'
            }}
          >
            <span style={{ fontSize: '11px', color: '#64748b', fontWeight: '600' }}>Popular:</span>
            {['Paracetamol', 'Dolo 650', 'Amoxicillin', 'Metformin', 'Cetirizine', 'Pantoprazole', 'Ibuprofen'].map(
              (med) => (
                <button
                  key={med}
                  type="button"
                  onClick={() => {
                    setQuery(med);
                    performSearch(med);
                  }}
                  style={{
                    fontSize: '11px',
                    padding: '3px 9px',
                    borderRadius: '14px',
                    backgroundColor: query.toLowerCase() === med.toLowerCase() ? '#dbeafe' : '#f1f5f9',
                    color: query.toLowerCase() === med.toLowerCase() ? '#1d4ed8' : '#475569',
                    border: '1px solid',
                    borderColor: query.toLowerCase() === med.toLowerCase() ? '#93c5fd' : '#e2e8f0',
                    cursor: 'pointer',
                    fontWeight: '500',
                    transition: 'all 0.15s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#e2e8f0';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor =
                      query.toLowerCase() === med.toLowerCase() ? '#dbeafe' : '#f1f5f9';
                  }}
                >
                  {med}
                </button>
              )
            )}
          </div>
        </div>

        {/* MODAL BODY (RESULTS) */}
        <div
          style={{
            padding: '20px 24px',
            overflowY: 'auto',
            flex: 1,
            backgroundColor: '#f8fafc'
          }}
        >
          {/* LOADING STATE */}
          {loading && (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '48px 0',
                gap: '12px'
              }}
            >
              <div
                style={{
                  width: '40px',
                  height: '40px',
                  border: '3px solid #e2e8f0',
                  borderTopColor: '#2563eb',
                  borderRadius: '50%',
                  animation: 'spin 0.8s linear infinite'
                }}
              />
              <div style={{ fontSize: '14px', fontWeight: '600', color: '#334155' }}>
                Querying Google Custom Search & Medical Repository...
              </div>
              <div style={{ fontSize: '12px', color: '#64748b' }}>
                Retrieving clinical indications, side effects, and verified web citations for "{query}"
              </div>
            </div>
          )}

          {/* ERROR STATE */}
          {!loading && error && (
            <div
              style={{
                backgroundColor: '#fef2f2',
                border: '1.5px solid #fecaca',
                borderRadius: '12px',
                padding: '20px',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '14px',
                color: '#991b1b'
              }}
            >
              <AlertTriangle size={22} style={{ color: '#dc2626', flexShrink: 0, marginTop: '2px' }} />
              <div>
                <h4 style={{ margin: '0 0 4px 0', fontSize: '14px', fontWeight: '700' }}>Search Error</h4>
                <p style={{ margin: 0, fontSize: '13px', color: '#b91c1c', lineHeight: '1.5' }}>{error}</p>
                <button
                  type="button"
                  onClick={() => performSearch(query)}
                  style={{
                    marginTop: '12px',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    backgroundColor: '#dc2626',
                    color: '#ffffff',
                    border: 'none',
                    padding: '6px 12px',
                    borderRadius: '6px',
                    fontSize: '12px',
                    fontWeight: '600',
                    cursor: 'pointer'
                  }}
                >
                  <RefreshCw size={13} /> Retry Search
                </button>
              </div>
            </div>
          )}

          {/* EMPTY INITIAL STATE */}
          {!loading && !error && !searchData && (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '48px 24px',
                textAlign: 'center',
                backgroundColor: '#ffffff',
                borderRadius: '12px',
                border: '1px dashed #cbd5e1'
              }}
            >
              <div
                style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: '50%',
                  backgroundColor: '#f1f5f9',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#64748b',
                  marginBottom: '12px'
                }}
              >
                <Pill size={24} />
              </div>
              <h4 style={{ margin: '0 0 6px 0', fontSize: '15px', fontWeight: '700', color: '#1e293b' }}>
                Search Any Medicine
              </h4>
              <p style={{ margin: 0, fontSize: '13px', color: '#64748b', maxWidth: '420px', lineHeight: '1.5' }}>
                Type the medicine name above or click any sample medication pill to view verified clinical information,
                mechanisms, and web references.
              </p>
            </div>
          )}

          {/* RESULTS DISPLAY */}
          {!loading && !error && searchData && searchData.items && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* RESULTS META BAR */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '6px 4px',
                  fontSize: '12px',
                  color: '#64748b'
                }}
              >
                <span>
                  Showing verified results for <strong style={{ color: '#0f172a' }}>"{searchData.query}"</strong>
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <ShieldCheck size={14} style={{ color: '#16a34a' }} />
                  {searchData.source === 'GOOGLE_CUSTOM_SEARCH_API'
                    ? 'Live Google Custom Search API'
                    : 'Verified Medical Knowledge Base'}
                </span>
              </div>

              {/* FIRST ITEM: DETAILED CLINICAL OVERVIEW CARD (IF DETAILS EXIST) */}
              {searchData.items[0]?.details && (
                <div
                  style={{
                    backgroundColor: '#ffffff',
                    border: '1px solid #bfdbfe',
                    borderRadius: '12px',
                    padding: '18px',
                    boxShadow: '0 4px 6px -1px rgba(59, 130, 246, 0.05)'
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      marginBottom: '12px',
                      paddingBottom: '8px',
                      borderBottom: '1px solid #eff6ff'
                    }}
                  >
                    <HeartPulse size={18} style={{ color: '#2563eb' }} />
                    <span style={{ fontSize: '14px', fontWeight: '800', color: '#1e40af' }}>
                      Clinical Summary & Usage Highlights
                    </span>
                    <span
                      style={{
                        marginLeft: 'auto',
                        fontSize: '11px',
                        fontWeight: '700',
                        backgroundColor: '#eff6ff',
                        color: '#1d4ed8',
                        padding: '2px 8px',
                        borderRadius: '6px'
                      }}
                    >
                      {searchData.items[0].details.category || 'Therapeutic Agent'}
                    </span>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '10px' }}>
                    {searchData.items[0].details.indications && (
                      <div style={{ fontSize: '13px' }}>
                        <span style={{ fontWeight: '700', color: '#334155' }}>Primary Indications: </span>
                        <span style={{ color: '#475569' }}>{searchData.items[0].details.indications}</span>
                      </div>
                    )}
                    {searchData.items[0].details.commonDosage && (
                      <div style={{ fontSize: '13px' }}>
                        <span style={{ fontWeight: '700', color: '#334155' }}>Dosage & Administration: </span>
                        <span style={{ color: '#475569' }}>{searchData.items[0].details.commonDosage}</span>
                      </div>
                    )}
                    {searchData.items[0].details.sideEffects && (
                      <div style={{ fontSize: '13px' }}>
                        <span style={{ fontWeight: '700', color: '#334155' }}>Known Side Effects: </span>
                        <span style={{ color: '#64748b' }}>{searchData.items[0].details.sideEffects}</span>
                      </div>
                    )}
                    {searchData.items[0].details.precautions && (
                      <div
                        style={{
                          fontSize: '12px',
                          backgroundColor: '#fef3c7',
                          color: '#92400e',
                          padding: '8px 12px',
                          borderRadius: '6px',
                          marginTop: '4px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px'
                        }}
                      >
                        <Info size={14} style={{ flexShrink: 0 }} />
                        <span>
                          <strong>Clinical Precaution: </strong>
                          {searchData.items[0].details.precautions}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* SEARCH RESULT CARDS */}
              {searchData.items.map((item, index) => (
                <div
                  key={index}
                  style={{
                    backgroundColor: '#ffffff',
                    border: '1px solid #e2e8f0',
                    borderRadius: '12px',
                    padding: '16px 18px',
                    transition: 'all 0.15s ease',
                    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = '#93c5fd';
                    e.currentTarget.style.boxShadow = '0 4px 12px rgba(59, 130, 246, 0.08)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = '#e2e8f0';
                    e.currentTarget.style.boxShadow = '0 1px 3px rgba(0, 0, 0, 0.05)';
                  }}
                >
                  {/* SOURCE & DISPLAY LINK */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      marginBottom: '6px'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Globe size={13} style={{ color: '#64748b' }} />
                      <span style={{ fontSize: '11px', color: '#475569', fontWeight: '600' }}>
                        {item.source || item.displayLink}
                      </span>
                      <span style={{ fontSize: '11px', color: '#94a3b8' }}>•</span>
                      <span style={{ fontSize: '11px', color: '#64748b' }}>{item.displayLink}</span>
                    </div>

                    <a
                      href={item.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        fontSize: '12px',
                        color: '#2563eb',
                        fontWeight: '600',
                        textDecoration: 'none',
                        padding: '3px 8px',
                        borderRadius: '6px',
                        backgroundColor: '#eff6ff',
                        transition: 'all 0.15s ease'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = '#dbeafe';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = '#eff6ff';
                      }}
                      title="Open full medical article in new tab"
                    >
                      <span>Read Source</span>
                      <ExternalLink size={12} />
                    </a>
                  </div>

                  {/* TITLE */}
                  <h4
                    style={{
                      margin: '0 0 6px 0',
                      fontSize: '15px',
                      fontWeight: '700',
                      color: '#0f172a',
                      lineHeight: '1.4'
                    }}
                  >
                    <a
                      href={item.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        color: '#1e293b',
                        textDecoration: 'none',
                        transition: 'color 0.15s ease'
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.color = '#2563eb')}
                      onMouseLeave={(e) => (e.currentTarget.style.color = '#1e293b')}
                    >
                      {item.title}
                    </a>
                  </h4>

                  {/* SNIPPET */}
                  <p
                    style={{
                      margin: 0,
                      fontSize: '13px',
                      color: '#475569',
                      lineHeight: '1.6'
                    }}
                  >
                    {item.snippet}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* MODAL FOOTER */}
        <div
          style={{
            padding: '14px 24px',
            borderTop: '1px solid #e2e8f0',
            backgroundColor: '#ffffff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: '#64748b' }}>
            <Info size={13} />
            <span>
              Always consult a licensed medical professional before starting or changing medications.
            </span>
          </div>

          <button
            id="close-medicine-search-modal-bottom-btn"
            type="button"
            onClick={onClose}
            style={{
              padding: '8px 18px',
              borderRadius: '8px',
              backgroundColor: '#f1f5f9',
              color: '#334155',
              border: '1px solid #cbd5e1',
              fontSize: '13px',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#e2e8f0';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = '#f1f5f9';
            }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default GoogleMedicineSearchModal;
