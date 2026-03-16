import WorkflowDiagram from '../components/workflow/WorkflowDiagram';

export default function WorkflowPage() {
  return (
    <div>
      <div className="mb-4">
        <h3 className="fw-bold mb-1">Order Workflow</h3>
        <p className="text-muted mb-0">Full lifecycle of an order from creation to completion. Each stage is handled by a specific role.</p>
      </div>
      <div style={{ maxWidth: 680 }}>
        <WorkflowDiagram />
      </div>
    </div>
  );
}

