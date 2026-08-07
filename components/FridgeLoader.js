export default function FridgeLoader({ active = false }) {
  return (
    <div className={`fridge-scene${active ? " is-open" : ""}`} aria-hidden="true">
      <div className="fridge">
        <div className="fridge-inside">
          <span className="food f1">🥬</span>
          <span className="food f2">🥚</span>
          <span className="food f3">🧅</span>
        </div>
        <div className="fridge-door">
          <span className="handle" />
        </div>
      </div>
    </div>
  );
}
