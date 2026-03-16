import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { ProgressBar, Badge } from 'react-bootstrap';
import { supabase } from '../../lib/supabaseClient';
import { useAuth } from '../../context/useAuth';

export interface UploadedFile {
  id: string;
  file_name: string;
  file_type: string;
  file_size: number;
  storage_path: string;
  public_url: string;
  label?: string;
  created_at: string;
  uploaded_by_name?: string;
}

interface Props {
  orderId: string;
  statusContext?: string;
  onUploaded?: (file: UploadedFile) => void;
  compact?: boolean;
}

const ACCEPTED_TYPES = {
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/png': ['.png'],
  'image/gif': ['.gif'],
  'image/webp': ['.webp'],
  'application/pdf': ['.pdf'],
  'application/msword': ['.doc'],
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
  'application/vnd.ms-excel': ['.xls'],
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
};

const MAX_SIZE = 20 * 1024 * 1024; // 20MB


function getFileIcon(mime: string) {
  if (mime.startsWith('image/')) return '🖼️';
  if (mime === 'application/pdf') return '📄';
  if (mime.includes('word')) return '📝';
  if (mime.includes('excel') || mime.includes('spreadsheet')) return '📊';
  return '📎';
}

interface PendingFile {
  file: File;
  progress: number;
  status: 'pending' | 'uploading' | 'done' | 'error';
  error?: string;
}

export default function FileUpload({ orderId, statusContext, onUploaded, compact = false }: Props) {
  const { profile } = useAuth();
  const [pendingFiles, setPendingFiles] = useState<PendingFile[]>([]);

  const onDrop = useCallback((accepted: File[]) => {
    const newPending: PendingFile[] = accepted.map(f => ({
      file: f,
      progress: 0,
      status: 'pending',
    }));
    setPendingFiles(prev => [...prev, ...newPending]);
    accepted.forEach((file) => uploadFile(file));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderId, profile]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: ACCEPTED_TYPES,
    maxSize: MAX_SIZE,
    multiple: true,
  });

  async function uploadFile(file: File) {
    const updateProgress = (progress: number, status: PendingFile['status'], error?: string) => {
      setPendingFiles(prev => {
        const updated = [...prev];
        const item = updated.find((p) => p.file === file);
        if (item) { item.progress = progress; item.status = status; if (error) item.error = error; }
        return updated;
      });
    };

    updateProgress(10, 'uploading');

    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const storagePath = `${orderId}/${Date.now()}_${safeName}`;

    const { error: upErr } = await supabase.storage
      .from('order-attachments')
      .upload(storagePath, file, { upsert: false });

    if (upErr) {
      updateProgress(0, 'error', upErr.message);
      return;
    }

    updateProgress(70, 'uploading');

    const { data: urlData } = supabase.storage
      .from('order-attachments')
      .getPublicUrl(storagePath);

    const publicUrl = urlData?.publicUrl || '';

    const { data: inserted, error: dbErr } = await supabase
      .from('order_attachments')
      .insert({
        order_id: orderId,
        uploaded_by: profile?.id,
        file_name: file.name,
        file_type: file.type,
        file_size: file.size,
        storage_path: storagePath,
        public_url: publicUrl,
        status_context: statusContext || null,
      })
      .select('*, profiles(full_name)')
      .single();

    if (dbErr) {
      updateProgress(0, 'error', dbErr.message);
      return;
    }

    updateProgress(100, 'done');

    if (onUploaded && inserted) {
      onUploaded({
        id: inserted.id,
        file_name: inserted.file_name,
        file_type: inserted.file_type,
        file_size: inserted.file_size,
        storage_path: inserted.storage_path,
        public_url: inserted.public_url,
        created_at: inserted.created_at,
        uploaded_by_name: inserted.profiles?.full_name,
      });
    }

    // Auto-clear done after 3s
    setTimeout(() => {
      setPendingFiles(prev => prev.filter(p => p.file !== file));
    }, 3000);
  }

  return (
    <div>
      <div
        {...getRootProps()}
        className={`file-drop-zone ${isDragActive ? 'active' : ''} ${compact ? 'compact' : ''}`}
      >
        <input {...getInputProps()} />
        <div className="drop-icon">{isDragActive ? '📂' : '📁'}</div>
        <div className="drop-text">
          {isDragActive
            ? 'Drop files here...'
            : compact
            ? 'Attach files (PDF, images, docs)'
            : 'Drag & drop files here, or click to browse'}
        </div>
        {!compact && (
          <div className="drop-hint">
            PDF, images, Word, Excel · Max 20MB per file
          </div>
        )}
      </div>

      {pendingFiles.length > 0 && (
        <div className="mt-2">
          {pendingFiles.map((pf, i) => (
            <div key={i} className="upload-progress-item">
              <span className="me-2">{getFileIcon(pf.file.type)}</span>
              <div className="flex-grow-1">
                <div className="d-flex justify-content-between align-items-center mb-1">
                  <small className="fw-semibold text-truncate" style={{ maxWidth: 200 }}>{pf.file.name}</small>
                  {pf.status === 'done' && <Badge bg="success" className="ms-2">✓ Done</Badge>}
                  {pf.status === 'error' && <Badge bg="danger" className="ms-2">Error</Badge>}
                </div>
                {pf.status === 'uploading' && (
                  <ProgressBar animated now={pf.progress} style={{ height: 4 }} />
                )}
                {pf.status === 'error' && (
                  <small className="text-danger">{pf.error}</small>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

