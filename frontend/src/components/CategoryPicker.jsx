import './CategoryPicker.css';

/**
 * Category color map — matches the CSS variables in index.css.
 */
const CATEGORY_COLORS = {
  'Food & Dining':     'var(--cat-food)',
  'Groceries':         'var(--cat-groceries)',
  'Transport':         'var(--cat-transport)',
  'Fuel':              'var(--cat-fuel)',
  'Bills & Utilities': 'var(--cat-bills)',
  'Medical':           'var(--cat-medical)',
  'Investment':        'var(--cat-investment)',
  'Shopping':          'var(--cat-shopping)',
  'Entertainment':     'var(--cat-entertainment)',
  'Drink':             'var(--cat-drink)',
  'Education':         'var(--cat-education)',
  'Travel':            'var(--cat-travel)',
  'Other':             'var(--cat-other)',
};

/**
 * Category emoji map for visual cues.
 */
const CATEGORY_ICONS = {
  'Food & Dining':     '🍛',
  'Groceries':         '🥬',
  'Transport':         '🚗',
  'Fuel':              '⛽',
  'Bills & Utilities': '💡',
  'Medical':           '💊',
  'Investment':        '📈',
  'Shopping':          '🛒',
  'Entertainment':     '🎬',
  'Drink':             '🍺',
  'Education':         '📚',
  'Travel':            '✈️',
  'Other':             '📋',
};

/**
 * CategoryPicker — color-coded chip selector for categories.
 * Highlights the AI suggestion if one exists.
 */
export default function CategoryPicker({ categories, selected, onSelect, disabled }) {
  return (
    <div className="cat-picker" role="radiogroup" aria-label="Select a category">
      {categories.map((cat) => {
        const isSelected = cat === selected;
        const color = CATEGORY_COLORS[cat] || 'var(--cat-other)';
        const icon = CATEGORY_ICONS[cat] || '📋';

        return (
          <button
            key={cat}
            className={`cat-chip ${isSelected ? 'cat-chip--selected' : ''}`}
            style={{ '--chip-color': color }}
            onClick={() => onSelect(cat)}
            disabled={disabled}
            role="radio"
            aria-checked={isSelected}
            id={`category-${cat.toLowerCase().replace(/[^a-z]/g, '-')}`}
          >
            <span className="cat-chip__icon">{icon}</span>
            <span className="cat-chip__label">{cat}</span>
          </button>
        );
      })}
    </div>
  );
}
