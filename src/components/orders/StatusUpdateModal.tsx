import React, { useState } from 'react';
import { Modal, Button, Form, Alert } from 'react-bootstrap';
import { MANDATORY_REMARK_STATUSES } from '../../lib/constants';
import type { OrderStatus } from '../../lib/constants';
import StatusBadge from './StatusBadge';
import FileUpload, { type UploadedFile } from './FileUpload';

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

interface Props {
  show: boolean;
  orderId: string;
  currentStatus: string;
  allowedNextStatuses: OrderStatus[];
  onConfirm: (newStatus: OrderStatus, remark: string) => Promise<void>;
  onHide: () => void;
}

export default function StatusUpdateModal({ show, orderId, currentStatus, allowedNextStatuses, onConfirm, onHide }: Props) {
  const [selectedStatus, setSelectedStatus] = useState<OrderStatus | ''>('');
  const [remark, setRemark] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);

  const requiresRemark = selectedStatus
    ? MANDATORY_REMARK_STATUSES.includes(selectedStatus as OrderStatus)
    : false;

  async function handleConfirm() {
    if (!selectedStatus) { setError('Please select a status.'); return; }
    if (requiresRemark && !remark.trim()) { setError('A reason/comment is required for this status.'); return; }
    setError('');
    setLoading(true);
    try {
      await onConfirm(selectedStatus as OrderStatus, remark.trim());
      setSelectedStatus('');
      setRemark('');
      setUploadedFiles([]);
      onHide();
    } catch (error: unknown) {
      setError(getErrorMessage(error, 'Failed to update status.'));
    } finally {
      setLoading(false);
    }
  }

  function handleClose() {
    setSelectedStatus('');
    setRemark('');
    setError('');
    setUploadedFiles([]);
    onHide();
  }

  return (
    <Modal show={show} onHide={handleClose} centered size="lg">
      <Modal.Header closeButton className="border-0 pb-0">
        <Modal.Title className="fw-bold">Update Order Status</Modal.Title>
      </Modal.Header>
      <Modal.Body className="pt-2">
        {error && <Alert variant="danger" className="py-2 rounded-3">{error}</Alert>}

        <div className="status-update-current mb-4">
          <small className="text-muted d-block mb-1">Current Status</small>
          <StatusBadge status={currentStatus} />
        </div>

        <Form.Group className="mb-3">
          <Form.Label className="fw-semibold">Move to <span className="text-danger">*</span></Form.Label>
          <Form.Select
            value={selectedStatus}
            onChange={e => setSelectedStatus(e.target.value as OrderStatus)}
            className="form-select-modern"
          >
            <option value="">— Select next status —</option>
            {allowedNextStatuses.map(s => (
              <option key={s} value={s}>{s}</option>
            ))}
          </Form.Select>
        </Form.Group>

        {selectedStatus && (
          <>
            <Form.Group className="mb-3">
              <Form.Label className="fw-semibold">
                Remark / Comment {requiresRemark && <span className="text-danger">*</span>}
              </Form.Label>
              <Form.Control
                as="textarea"
                rows={3}
                placeholder={requiresRemark ? 'Required for this status change...' : 'Optional remark or note...'}
                value={remark}
                onChange={e => setRemark(e.target.value)}
                className="form-control-modern"
              />
            </Form.Group>

            <div className="mb-1">
              <Form.Label className="fw-semibold">Attach Files <span className="text-muted fw-normal">(optional)</span></Form.Label>
              <p className="text-muted small mb-2">Upload supporting documents for this status update (PDF, images, docs)</p>
              <FileUpload
                orderId={orderId}
                statusContext={selectedStatus}
                onUploaded={f => setUploadedFiles(prev => [...prev, f])}
                compact
              />
              {uploadedFiles.length > 0 && (
                <div className="mt-2">
                  {uploadedFiles.map(f => (
                    <div key={f.id} className="d-flex align-items-center gap-2 py-1">
                      <span className="text-success">✓</span>
                      <small className="text-muted">{f.file_name}</small>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </Modal.Body>
      <Modal.Footer className="border-0 pt-0">
        <Button variant="ghost-secondary" onClick={handleClose} disabled={loading} className="btn-modern">
          Cancel
        </Button>
        <Button variant="primary" onClick={handleConfirm} disabled={loading || !selectedStatus} className="btn-modern">
          {loading ? (
            <><span className="spinner-border spinner-border-sm me-2" role="status" />Updating...</>
          ) : (
            'Confirm Update'
          )}
        </Button>
      </Modal.Footer>
    </Modal>
  );
}
