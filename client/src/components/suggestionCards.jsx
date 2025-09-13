// SuggestionCards.jsx
import React from 'react';
import '../styles/suggestionCards.css';

const suggestions = [
  "show the names of the 10 top workers",
  "list all departments",
  "get employee count",
  "show project deadlines",
];

const SuggestionCards = ({ onSuggestionClick }) => (
  <div className="suggestion-container">
    {suggestions.map((text, i) => (
      <div key={i} className="suggestion-card" onClick={() => onSuggestionClick(text)}>
        {text}
      </div>
    ))}
  </div>
);

export default SuggestionCards;
