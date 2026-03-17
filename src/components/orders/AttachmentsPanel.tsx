import React, { useState, useEffect } from 'react';
import { Row, Col, Spinner, Badge, Button, Modal } from 'react-bootstrap';
import { supabase } from '../../lib/supabaseClient';
import { useAuth } from '../../context/useAuth';
import type { OrderAttachment } from '../../lib/types';
import FileUpload from './FileUpload';

function formatFileSize(bytes: number) {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function isImage(mime: string) {
  return mime?.startsWith('image/');
}

function isPDF(mime: string) {
  return mime === 'application/pdf';
}

function getFileIcon(mime: string) {
  if (mime?.startsWith('image/')) return '🖼️';
  if (mime === 'application/pdf') return '📄';
  if (mime?.includes('word')) return '📝';
  if (mime?.includes('excel') || mime?.includes('spreadsheet')) return '📊';
  return '📎';
}

interface Props {
  orderId: string;
  refreshTrigger?: number;
}

export default function AttachmentsPanel({ orderId, refreshTrigger }: Props) {
  const { profile } = useAuth();
  const [attachments, setAttachments] = useState<OrderAttachment[]>([]);
  const [loading, setLoading] = useState(true);
  const [lightbox, setLightbox] = useState<OrderAttachment | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  useEffect(() => {
    let isActive = true;

    async function fetchAttachments() {
      setLoading(true);
      const { data } = await supabase
        .from('order_attachments')
        .select('*, profiles(full_name)')
        .eq('order_id', orderId)
        .order('created_at', { ascending: false });

      if (!isActive) {
        return;
      }

      setAttachments((data as OrderAttachment[]) || []);
      setLoading(false);
    }

    void fetchAttachments();

    return () => {
      isActive = false;
    };
  }, [orderId]);

  // Refresh attachments when refreshTrigger changes
  useEffect(() => {
    if (refreshTrigger === undefined) return;
    void refreshAttachments();
  }, [refreshTrigger]);

  async function refreshAttachments() {
    setLoading(true);
    const { data } = await supabase
      .from('order_attachments')
      .select('*, profiles(full_name)')
      .eq('order_id', orderId)
      .order('created_at', { ascending: false });

    setAttachments((data as OrderAttachment[]) || []);
    setLoading(false);
  }

  function handleUploaded() {
    void refreshAttachments();
  }

  async function handleDelete(att: OrderAttachment) {
    if (!confirm(`Delete "${att.file_name}"?`)) return;
    setDeleting(att.id);
    await supabase.storage.from('order-attachments').remove([att.storage_path]);
    await supabase.from('order_attachments').delete().eq('id', att.id);
    setAttachments(prev => prev.filter(a => a.id !== att.id));
    setDeleting(null);
  }

  return (
    <div>
      <FileUpload orderId={orderId} onUploaded={handleUploaded} />

      <div className="mt-4">
        {loading ? (
          <div className="text-center py-3"><Spinner animation="border" size="sm" /></div>
        ) : attachments.length === 0 ? (
          <div className="text-center py-4 text-muted">
            <div style={{ fontSize: '2rem' }}>📂</div>
            <p className="mt-2 mb-0">No attachments yet</p>
          </div>
        ) : (
          <Row className="g-3">
            {attachments.map(att => (
              <Col key={att.id} xs={6} sm={4} md={3} lg={2}>
                <div className="attachment-card">
                  {/* Thumbnail */}
                  <div
                    className="attachment-thumb"
                    onClick={() => (isImage(att.file_type) || isPDF(att.file_type)) && setLightbox(att)}
                    style={{ cursor: isImage(att.file_type) || isPDF(att.file_type) ? 'zoom-in' : 'default' }}
                  >
                    {isImage(att.file_type) ? (
                      <img
                        src={att.public_url}
                        alt={att.file_name}
                        className="attachment-thumb-img"
                      />
                    ) : isPDF(att.file_type) ? (
                      <div className="attachment-thumb-pdf">
                        <div style={{ fontSize: '2.5rem' }}>📄</div>
                        <small className="text-danger fw-bold">PDF</small>
                      </div>
                    ) : (
                      <div className="attachment-thumb-file">
                        <div style={{ fontSize: '2.5rem' }}>{getFileIcon(att.file_type)}</div>
                        <small className="text-muted">{att.file_name.split('.').pop()?.toUpperCase()}</small>
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="attachment-info">
                    <p className="attachment-name text-truncate mb-0" title={att.file_name}>
                      {att.file_name}
                    </p>
                    <small className="text-muted d-block">{formatFileSize(att.file_size)}</small>
                    {att.status_context && (
                      <Badge bg="primary" text="white" className="mt-1" style={{ fontSize: '0.65rem' }}>
                        {att.status_context}
                      </Badge>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="attachment-actions">
                    <a
                      href={att.public_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn btn-sm btn-outline-primary attachment-btn"
                      title="Open"
                    >
                      ↗
                    </a>
                    {(profile?.id === att.uploaded_by || profile?.role === 'admin') && (
                      <Button
                        size="sm"
                        variant="outline-danger"
                        className="attachment-btn"
                        onClick={() => handleDelete(att)}
                        disabled={deleting === att.id}
                        title="Delete"
                      >
                        {deleting === att.id ? '...' : '🗑'}
                      </Button>
                    )}
                  </div>
                </div>
              </Col>
            ))}
          </Row>
        )}
      </div>

      {/* Lightbox */}
      <Modal show={!!lightbox} onHide={() => setLightbox(null)} size="lg" centered>
        <Modal.Header closeButton>
          <Modal.Title className="text-truncate" style={{ maxWidth: '80%' }}>
            {lightbox?.file_name}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body className="p-0 text-center bg-dark" style={{ minHeight: 400 }}>
          {lightbox && isImage(lightbox.file_type) && (
            <img
              src={lightbox.public_url}
              alt={lightbox.file_name}
              style={{ maxWidth: '100%', maxHeight: '75vh', objectFit: 'contain' }}
            />
          )}
          {lightbox && isPDF(lightbox.file_type) && (
            <iframe
              src={lightbox.public_url}
              title={lightbox.file_name}
              style={{ width: '100%', height: '75vh', border: 'none' }}
            />
          )}
        </Modal.Body>
        <Modal.Footer className="py-2">
          <small className="text-muted me-auto">
            Uploaded by {lightbox?.profiles?.full_name || 'Unknown'} ·{' '}
            {lightbox ? new Date(lightbox.created_at).toLocaleString() : ''}
          </small>
          <a href={lightbox?.public_url} target="_blank" rel="noopener noreferrer" className="btn btn-sm btn-primary">
            Open in new tab
          </a>
        </Modal.Footer>
      </Modal>
    </div>
  );
}

