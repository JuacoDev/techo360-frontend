// src/components/UI/Input.jsx
import "../Css/StyleComponents.css";

function Input({ type = "text", placeholder, value, onChange }) {
  return (
    <input 
      className="UI-input"
      type={type}
      placeholder={placeholder}
      value={value}
      onChange={onChange}
    />
  );
}

export default Input;
