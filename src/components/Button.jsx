// src/components/UI/Button.jsx
import "../Css/StyleComponents.css";

function Button({ children, onClick, type = "button" }) {
  return (
    <button 
      className="UI-button" 
      type={type} 
      onClick={onClick}
    >
      {children}
    </button>
  );
}

export default Button;
