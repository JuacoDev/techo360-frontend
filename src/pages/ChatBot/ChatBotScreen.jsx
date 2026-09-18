import { useState } from "react";
import "../../Css/StyleHome.css";
import "../../Css/StyleComponents.css";
import CabezaDeNavegacion from "../../components/CabezaDeNavegacion";
import LogoChatbotBot from "../../assets/LogoChatbotBot.png";

// Pantalla propia del ChatBot (no el widget flotante de components/Chatbot.jsx,
// que sigue oculto en App.jsx porque el backend del chat todavia no tiene
// una ruta real -- solo /health). Se llega aqui solo con sesion iniciada,
// gate que resuelve Home.jsx antes de hacer setScreen("chatbot").
function ChatBotScreen({ setScreen, onLogout }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");

  const handleSend = () => {
    if (input.trim() === "") return;
    setMessages((prev) => [...prev, { from: "user", text: input }]);
    setInput("");
  };

  return (
    <div className="home-screen">
      <CabezaDeNavegacion setScreen={setScreen} onLogout={onLogout} />

      <div className="chatbot-screen">
        <div className="chatbot-screen-panel">
          <div className="ChatBot-header">
            <div className="ChatBot-header-left">
              <img src={LogoChatbotBot} alt="Logo Bot" className="ChatBot-header-logo" />
              <h3>TechoBot</h3>
            </div>
          </div>

          <div className="ChatBot-messages chatbot-screen-messages">
            {messages.length === 0 && (
              <p className="chatbot-screen-vacio">
                Escribe tu pregunta sobre pobreza y déficit de vivienda en Colombia.
              </p>
            )}
            {messages.map((msg, i) => (
              <div key={i} className={msg.from === "bot" ? "bot-msg" : "user-msg"}>
                {msg.text}
              </div>
            ))}
          </div>

          <div className="ChatBot-input">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSend()}
              placeholder="Envía un mensaje..."
            />
            <button onClick={handleSend}>➤</button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ChatBotScreen;
