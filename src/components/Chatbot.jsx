import { useState } from "react";
import "../Css/StyleComponents.css"; 
import LogoChatbot from "../assets/LogoChatbot.png";
import LogoChatbotBot from "../assets/LogoChatbotBot.png";

function ChatBot() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");

  const handleSend = () => {
    if (input.trim() === "") return;
    setMessages([...messages, { from: "user", text: input }]);
    setInput("");
  };

  return (
    <div className="ChatBot-container">
      {!open && (
        <img 
          src={LogoChatbot} 
          alt="Abrir ChatBot" 
          className="ChatBot-icon" 
          onClick={() => setOpen(true)} 
        />
      )}

      {open && (
        <div className="ChatBot-window">
          <div className="ChatBot-header">
            <div className="ChatBot-header-left">
              <img src={LogoChatbotBot} alt="Logo Bot" className="ChatBot-header-logo" />
              <h3>TechoBot</h3>
            </div>
            <button className="ChatBot-close" onClick={() => setOpen(false)}>✖</button>
          </div>

          <div className="ChatBot-messages">
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
              placeholder="Envia un mensaje..." 
            />
            <button onClick={handleSend}>➤</button>
          </div>
        </div>
      )}
    </div>
  );
}

export default ChatBot;
