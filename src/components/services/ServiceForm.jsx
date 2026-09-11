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
    <div className="modal">
      <form onSubmit={handleSubmit}>
        <div className="modal-head">
          <h2>{isEditing ? "Edit Service" : "Add Service"}</h2>

          <button type="button" onClick={onClose}>
            ×
          </button>
        </div>

        <label>
          Service Name
          <input
            name="name"
            required
            placeholder="e.g. Cloud Migration"
            defaultValue={service?.name || ""}
          />
        </label>

        <label>
          Category
          <input
            name="category"
            placeholder="e.g. Cloud"
            defaultValue={service?.category || ""}
          />
        </label>

        <label>
          Description
          <textarea
            name="description"
            rows="4"
            placeholder="Describe the service..."
            defaultValue={service?.description || ""}
          />
        </label>

        <label>
          Status
          <select name="status" defaultValue={service?.status || "Active"}>
            <option value="Active">Active</option>
            <option value="Inactive">Inactive</option>
          </select>
        </label>

        <button className="primary" type="submit">
          {isEditing ? "Update Service" : "Create Service"}
        </button>
      </form>
    </div>
  );
}

export default ServiceForm;
