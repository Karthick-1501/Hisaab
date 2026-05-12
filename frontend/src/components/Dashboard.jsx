import { useState, useEffect, useCallback } from 'react';
import { fetchDashboardSummary, fetchDashboardChart, fetchBudgets, fetchTransactions, fetchCategories, confirmTransaction } from '../api';
import { 
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, Legend 
} from 'recharts';
import Skeleton from './Skeleton.jsx';
import TransactionCard from './TransactionCard.jsx';
import Toast from './Toast.jsx';
import './Dashboard.css';

const CATEGORY_COLORS = {
  'Food & Dining':     '#f97316',
  'Groceries':         '#22c55e',
  'Transport':         '#3b82f6',
  'Fuel':              '#eab308',
  'Bills & Utilities': '#06b6d4',
  'Medical':           '#ef4444',
  'Investment':        '#8b5cf6',
  'Shopping':          '#ec4899',
  'Entertainment':     '#f43f5e',
  'Drink':             '#d946ef',
  'Education':         '#14b8a6',
  'Travel':            '#0ea5e9',
  'Other':             '#64748b',
};

export default function Dashboard() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [summary, setSummary] = useState(null);
  const [chartData, setChartData] = useState([]);
  const [budgets, setBudgets] = useState([]);
  const [categories, setCategories] = useState([]);
  
  // Daily transactions state
  const [selectedDate, setSelectedDate] = useState(null);
  const [dayTransactions, setDayTransactions] = useState([]);
  const [loadingDay, setLoadingDay] = useState(false);
  
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((message, type = 'success') => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message, type }]);
  }, []);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [sumData, chartRes, budData, catData] = await Promise.all([
        fetchDashboardSummary(),
        fetchDashboardChart(),
        fetchBudgets(),
        fetchCategories()
      ]);
      setSummary(sumData);
      setChartData(chartRes);
      setBudgets(budData);
      setCategories(catData.categories);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleDayClick = async (data) => {
    if (!data || !data.activePayload || !data.activePayload.length) return;
    const date = data.activePayload[0].payload.date;
    setSelectedDate(date);
    setLoadingDay(true);
    try {
      const res = await fetchTransactions({ date, limit: 100 });
      setDayTransactions(res.transactions);
    } catch (err) {
      addToast(err.message, 'error');
    } finally {
      setLoadingDay(false);
    }
  };

  const handleCategoryChange = async (txnId, newCategory) => {
    try {
      await confirmTransaction(txnId, newCategory);
      addToast(`Updated to ${newCategory}`);
      // Refresh the day transactions and the dashboard summary
      const res = await fetchTransactions({ date: selectedDate, limit: 100 });
      setDayTransactions(res.transactions);
      await loadData();
    } catch (err) {
      addToast(err.message, 'error');
      throw err;
    }
  };

  if (loading && !summary) return <div className="container"><Skeleton count={3} /></div>;
  if (error) return <div className="container error-banner"><span>⚠️ {error}</span></div>;
  if (!summary) return null;

  return (
    <div className="dashboard animate-fade-in">
      {/* KPI Cards */}
      <div className="dashboard__kpis">
        <div className="kpi-card">
          <span className="kpi-card__label">Total Spend</span>
          <span className="kpi-card__value kpi-card__value--danger">
            ₹{summary.total_spend.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </span>
        </div>
        <div className="kpi-card">
          <span className="kpi-card__label">Total Income</span>
          <span className="kpi-card__value kpi-card__value--success">
            ₹{summary.total_income.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </span>
        </div>
      </div>

      <div className="dashboard__grid">
        {/* Daily Spend Chart */}
        <div className="dashboard-panel">
          <h3 className="dashboard-panel__title">Daily Spend (Click a bar)</h3>
          <div className="dashboard-panel__chart">
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={chartData} onClick={handleDayClick} style={{ cursor: 'pointer' }}>
                <XAxis 
                  dataKey="date" 
                  tickFormatter={(val) => val.split('-')[2]} 
                  stroke="#8b8b9e" 
                  fontSize={12} 
                />
                <YAxis 
                  stroke="#8b8b9e" 
                  fontSize={12} 
                  tickFormatter={(val) => `₹${val}`} 
                />
                <Tooltip 
                  cursor={{fill: 'rgba(255,255,255,0.05)'}}
                  contentStyle={{ backgroundColor: '#12121a', border: '1px solid #2a2a35', borderRadius: '8px' }}
                  itemStyle={{ color: '#f0f0f5' }}
                />
                <Bar dataKey="amount" fill="var(--accent)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Spend by Category Pie Chart */}
        <div className="dashboard-panel">
          <h3 className="dashboard-panel__title">Spend by Category</h3>
          <div className="dashboard-panel__chart">
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={summary.spend_by_category}
                  dataKey="amount"
                  nameKey="category"
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  innerRadius={50}
                  paddingAngle={2}
                >
                  {summary.spend_by_category.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={CATEGORY_COLORS[entry.category] || CATEGORY_COLORS['Other']} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ backgroundColor: '#12121a', border: '1px solid #2a2a35', borderRadius: '8px' }}
                  itemStyle={{ color: '#f0f0f5' }}
                />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '12px' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Selected Day Transactions */}
      {selectedDate && (
        <div className="dashboard-panel dashboard-panel--full animate-fade-in">
          <h3 className="dashboard-panel__title">Transactions on {selectedDate}</h3>
          {loadingDay ? (
            <Skeleton count={2} />
          ) : dayTransactions.length > 0 ? (
            <div className="txn-list">
              {dayTransactions.map((txn) => (
                <TransactionCard
                  key={txn.id}
                  transaction={txn}
                  categories={categories}
                  onConfirm={handleCategoryChange}
                />
              ))}
            </div>
          ) : (
            <p className="text-muted">No transactions found for this day.</p>
          )}
        </div>
      )}

      {/* Budgets Progress */}
      {budgets.length > 0 && (
        <div className="dashboard-panel dashboard-panel--full">
          <h3 className="dashboard-panel__title">Budget Tracking</h3>
          <div className="budget-list">
            {budgets.map(b => {
              const percent = Math.min((b.spent / b.budget_amount) * 100, 100);
              const isOver = b.spent > b.budget_amount;
              return (
                <div key={b.id} className="budget-item">
                  <div className="budget-item__header">
                    <span className="budget-item__category">{b.category}</span>
                    <span className="budget-item__amounts">
                      <strong className={isOver ? 'text-danger' : ''}>₹{b.spent.toLocaleString('en-IN')}</strong> / ₹{b.budget_amount.toLocaleString('en-IN')}
                    </span>
                  </div>
                  <div className="budget-item__track">
                    <div 
                      className={`budget-item__fill ${isOver ? 'budget-item__fill--danger' : ''}`}
                      style={{ width: `${percent}%`, backgroundColor: CATEGORY_COLORS[b.category] || 'var(--accent)' }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {toasts.map((t) => (
        <Toast
          key={t.id}
          message={t.message}
          type={t.type}
          onDismiss={() => removeToast(t.id)}
        />
      ))}
    </div>
  );
}
