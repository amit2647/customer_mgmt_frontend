import Modal from "../ui/Modal";

function ServiceForm({ service = null, onSubmit, onClose }) {
  const isEditing = Boolean(service);

  async function handleSubmit(e) {
    e.preventDefault();

    const formData = new FormData(e.target);

    const name = formData.get("name")?.trim();

    if (!name) {
      alert("Service name is required.");
      return;
    }

    const data = {
      name,
      description: formData.get("description")?.trim() || "",
      category: formData.get("category")?.trim() || "",
      status: formData.get("status") || "Active",
    };

    await onSubmit(data);
  }

  return (
    <Modal
      title={isEditing ? "Edit service" : "Add service"}
      description={isEditing ? "Its reference stays the same, so its deadlines and letters stay attached." : "Once saved, add its deadlines on the service's own page."}
      onClose={onClose}
      onSubmit={handleSubmit}
      footer={
        <>
          <button type="button" className="secondary-button" onClick={onClose}>Cancel</button>
          <button className="primary" type="submit">{isEditing ? "Save service" : "Add service"}</button>
        </>
      }
    >
      <div className="modal-fields two">
        <label className="wide">
          Service name
          <input name="name" required placeholder="e.g. GST Returns" defaultValue={service?.name || ""} autoFocus />
        </label>

        <label>
          Group
          <input name="category" placeholder="e.g. GST" defaultValue={service?.category || ""} />
        </label>

        <label>
          Status
          <select name="status" defaultValue={service?.status || "Active"}>
            <option value="Active">Active</option>
            <option value="Inactive">Inactive</option>
          </select>
        </label>

        <label className="wide">
          Description
          <textarea name="description" rows="4" placeholder="What the service covers" defaultValue={service?.description || ""} />
        </label>
      </div>
    </Modal>
  );
}

export default ServiceForm;
