function SearchBar({ value, onChange, placeholder = "Search...", count }) {
  return (
    <section className="toolbar">
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
      />

      <span>{count} records</span>
    </section>
  );
}

export default SearchBar;
