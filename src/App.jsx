import { useCallback, useEffect, useMemo, useState } from 'react'
import './App.css'

const API_BASE = 'https://staging.fastor.ai/v1'
const fallbackRestaurants = [
  { id: 1, name: 'Sushi House', cuisine: 'Japanese · Sushi', rating: '4.8', time: '25-35 min', image: 'https://images.unsplash.com/photo-1579871494447-9811cf80d66c?auto=format&fit=crop&w=800&q=80' },
  { id: 2, name: 'The Burger Club', cuisine: 'American · Burgers', rating: '4.6', time: '20-30 min', image: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=800&q=80' },
  { id: 3, name: 'Bella Italia', cuisine: 'Italian · Pizza', rating: '4.9', time: '30-40 min', image: 'https://images.unsplash.com/photo-1579751626657-72bc17010498?auto=format&fit=crop&w=800&q=80' },
]

const popularItems = [
  { name: 'Truffle Mushroom Pizza', restaurant: 'Crust & Craft', price: 14, image: 'https://images.unsplash.com/photo-1574071318508-1cdbab80d002?auto=format&fit=crop&w=600&q=80' },
  { name: 'Classic Smash Burger', restaurant: 'The Burger Club', price: 12, image: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=600&q=80' },
  { name: 'Strawberry Shake', restaurant: 'Shake Theory', price: 8, image: 'https://images.unsplash.com/photo-1572490122747-3968b75cc699?auto=format&fit=crop&w=600&q=80' },
]

function Arrow({ direction = 'left' }) {
  return <span className={`arrow arrow-${direction}`} aria-hidden="true">→</span>
}

function App() {
  const [screen, setScreen] = useState(localStorage.getItem('fastor_token') ? 'home' : 'phone')
  const [phone, setPhone] = useState('')
  const [otp, setOtp] = useState('')
  const [token, setToken] = useState(localStorage.getItem('fastor_token') || '')
  const [restaurants, setRestaurants] = useState([])
  const [selectedRestaurant, setSelectedRestaurant] = useState(null)
  const [city] = useState('Model Town, New Delhi')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [cart, setCart] = useState([])

  async function request(path, body, authToken) {
    const response = await fetch(`${API_BASE}${path}`, {
      method: body ? 'POST' : 'GET',
      headers: { ...(body && { 'Content-Type': 'application/x-www-form-urlencoded' }), ...(authToken && { Authorization: `Bearer ${authToken}` }) },
      body: body && new URLSearchParams(body),
    })
    if (!response.ok) throw new Error('Something went wrong. Please try again.')
    return response.json()
  }

  async function sendOtp(event) {
    event.preventDefault()
    if (phone.replace(/\D/g, '').length < 10) return setError('Please enter a valid 10-digit mobile number.')
    setLoading(true); setError('')
    try {
      await request('/pwa/user/register', { phone, dial_code: '+91' })
      setScreen('otp')
    } catch (requestError) {
      setError(requestError.message)
    } finally { setLoading(false) }
  }

  async function verifyOtp(event) {
    event.preventDefault()
    if (otp.length !== 6) return setError('Enter the 6-digit code to continue.')
    setLoading(true); setError('')
    try {
      const result = await request('/pwa/user/login', { phone, otp, dial_code: '+91' })
      const nextToken = result?.data?.token
      if (!nextToken) throw new Error('We could not verify your account. Please try again.')
      localStorage.setItem('fastor_token', nextToken)
      setToken(nextToken)
      setScreen('home')
    } catch (requestError) {
      setError(requestError.message)
    } finally { setLoading(false) }
  }

  const loadRestaurants = useCallback(async () => {
    try {
      const result = await request('/m/restaurant?city_id=118', null, token)
      const data = result?.data || result?.restaurants || result
      setRestaurants(Array.isArray(data) ? data : fallbackRestaurants)
    } catch {
      setRestaurants(fallbackRestaurants)
    } finally { setLoading(false) }
  }, [token])

  useEffect(() => {
    // Authentication can be restored from storage, so this fetch must run on mount.
    // oxlint-disable-next-line react/set-state-in-effect
    if (screen === 'home' && token) loadRestaurants()
  }, [screen, token, loadRestaurants])

  const displayRestaurants = restaurants.length ? restaurants : fallbackRestaurants
  const cartTotal = useMemo(() => cart.reduce((total, item) => total + item.price, 0), [cart])

  function addToCart(item) {
    setCart((current) => [...current, item])
  }

  if (screen === 'phone') return (
    <AuthShell>
      <button className="back-button" aria-label="Go back"><Arrow /></button>
      <div className="auth-kicker">WELCOME TO FASTOR</div>
      <h1>Good food.<br /><em>Good mood.</em></h1>
      <p className="auth-copy">Enter your mobile number and we’ll send you a one-time password to get started.</p>
      <form onSubmit={sendOtp} className="auth-form">
        <label htmlFor="phone">Mobile number</label>
        <div className="phone-input">
          <span>+91</span><span className="divider" />
          <input id="phone" inputMode="numeric" maxLength="10" value={phone} onChange={(event) => setPhone(event.target.value.replace(/\D/g, ''))} placeholder="00000 00000" />
        </div>
        {error && <p className="form-error">{error}</p>}
        <button className="primary-button" disabled={loading}>{loading ? 'Sending...' : 'Get OTP'} <Arrow direction="right" /></button>
      </form>
      <p className="legal">By continuing, you agree to our <u>Terms & Conditions</u> and <u>Privacy Policy</u>.</p>
    </AuthShell>
  )

  if (screen === 'otp') return (
    <AuthShell>
      <button className="back-button" onClick={() => { setScreen('phone'); setError('') }} aria-label="Go back"><Arrow /></button>
      <div className="auth-kicker">SECURE LOGIN</div>
      <h1>Enter your<br /><em>verification code.</em></h1>
      <p className="auth-copy">We sent a 6-digit code to <strong>+91 {phone}</strong>. For this demo, use <strong>123456</strong>.</p>
      <form onSubmit={verifyOtp} className="auth-form">
        <label htmlFor="otp">6-digit code</label>
        <input id="otp" className="otp-input" inputMode="numeric" maxLength="6" value={otp} onChange={(event) => setOtp(event.target.value.replace(/\D/g, ''))} placeholder="• • • • • •" autoFocus />
        {error && <p className="form-error">{error}</p>}
        <button className="primary-button" disabled={loading}>{loading ? 'Checking...' : 'Continue'} <Arrow direction="right" /></button>
      </form>
      <p className="resend">Didn’t receive a code? <button type="button" onClick={sendOtp}>Resend OTP</button></p>
    </AuthShell>
  )

  if (screen === 'detail' && selectedRestaurant) return (
    <main className="app-shell">
      <header className="topbar"><button className="icon-button" onClick={() => setScreen('home')}><Arrow /></button><span className="brand">fastor<span>.</span></span><button className="cart-button" onClick={() => setScreen('cart')}>Bag <b>{cart.length}</b></button></header>
      <section className="detail-page">
        <img className="detail-image" src={selectedRestaurant.image || fallbackRestaurants[0].image} alt={selectedRestaurant.name || 'Restaurant'} />
        <div className="detail-heading"><div><p className="eyebrow">{selectedRestaurant.cuisine || 'RESTAURANT'}</p><h2>{selectedRestaurant.name || 'Featured restaurant'}</h2></div><span className="rating">★ {selectedRestaurant.rating || '4.8'}</span></div>
        <p className="muted">Fresh ingredients, generous portions and food made with care. Order your favourites for delivery or pickup.</p>
        <h3>Popular on the menu</h3>
        <div className="menu-list">{popularItems.map((item) => <MenuItem key={item.name} item={item} onAdd={() => addToCart(item)} />)}</div>
      </section>
      {cart.length > 0 && <button className="floating-cart" onClick={() => setScreen('cart')}>View bag · ${cartTotal.toFixed(2)} <Arrow direction="right" /></button>}
    </main>
  )

  if (screen === 'cart') return (
    <main className="app-shell"><header className="topbar"><button className="icon-button" onClick={() => setScreen('home')}><Arrow /></button><span className="brand">your <span>bag.</span></span></header><section className="cart-page"><p className="eyebrow">YOUR ORDER</p><h2>Almost ready<br /><em>to eat.</em></h2>{cart.map((item, index) => <div className="cart-row" key={`${item.name}-${index}`}><img src={item.image} alt="" /><div><strong>{item.name}</strong><p>{item.restaurant}</p></div><b>${item.price.toFixed(2)}</b></div>)}<div className="cart-total"><span>Total</span><strong>${cartTotal.toFixed(2)}</strong></div><button className="primary-button" onClick={() => alert('Order placed!')}>Place order <Arrow direction="right" /></button></section></main>
  )

  return (
    <main className="app-shell">
      <header className="topbar"><div><span className="brand">fastor<span>.</span></span><p className="location-label">DELIVERING TO</p><button className="location">{city} <span>⌄</span></button></div><button className="profile-button">K</button></header>
      <section className="home-content">
        <div className="greeting"><div><p className="eyebrow">SATURDAY, 09 NOVEMBER</p><h1>What are you<br />craving, <em>Karan?</em></h1></div><div className="sun">☀</div></div>
        <div className="search-bar"><span>⌕</span><input placeholder="Search restaurants or dishes" /><kbd>⌘ K</kbd></div>
        <div className="section-title"><h2>Best sellers</h2><button>See all <Arrow direction="right" /></button></div>
        <div className="restaurant-grid">{displayRestaurants.slice(0, 3).map((restaurant, index) => <button className="restaurant-card" key={restaurant.id || index} onClick={() => { setSelectedRestaurant(restaurant); setScreen('detail') }}><img src={restaurant.image || fallbackRestaurants[index].image} alt="" /><span className="card-rating">★ {restaurant.rating || '4.8'}</span><div className="card-info"><strong>{restaurant.name || 'Local favourite'}</strong><small>{restaurant.cuisine || 'Freshly made · Delivery'}</small><small className="time">{restaurant.time || '25-35 min'} · Free delivery</small></div></button>)}</div>
        <div className="promo"><div><p>MADE FOR YOUR MOOD</p><strong>Hungry?<br />We’ve got you.</strong><button onClick={() => document.querySelector('.popular')?.scrollIntoView({ behavior: 'smooth' })}>Explore menu <Arrow direction="right" /></button></div><div className="promo-art">🍕</div></div>
        <div className="section-title popular"><h2>Popular near you</h2><button>See all <Arrow direction="right" /></button></div>
        <div className="popular-list">{popularItems.map((item) => <MenuItem key={item.name} item={item} onAdd={() => addToCart(item)} />)}</div>
      </section>
      <nav className="bottom-nav"><button className="active">⌂<span>Home</span></button><button>◉<span>Orders</span></button><button onClick={() => setScreen('cart')}>▱<span>Bag {cart.length > 0 && `(${cart.length})`}</span></button><button>♡<span>Profile</span></button></nav>
      {loading && <div className="loading-dot" aria-label="Loading" />}
    </main>
  )
}

function AuthShell({ children }) {
  return <main className="auth-shell"><div className="auth-brand">fastor<span>.</span></div><div className="auth-card">{children}</div><div className="auth-aside"><span>01</span><div><strong>Food for every feeling.</strong><p>Discover local gems and your new favourite meal.</p></div></div></main>
}

function MenuItem({ item, onAdd }) {
  return <article className="menu-item"><img src={item.image} alt="" /><div><strong>{item.name}</strong><p>{item.restaurant}</p><b>${item.price.toFixed(2)}</b></div><button onClick={onAdd} aria-label={`Add ${item.name}`}>+</button></article>
}

export default App
