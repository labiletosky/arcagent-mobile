import './style.css'
import { ethers } from 'ethers'
import { createAppKit } from '@reown/appkit'
import { EthersAdapter } from '@reown/appkit-adapter-ethers'

const PROJECT_ID = '3f606d90e27edfdd5d9d6b7f3a469448'
const AGENT_ADDR = '0x311C7939d6026707029A191DF77F1D56e9992807'
const TOKEN_ADDR = '0x3600000000000000000000000000000000000000'
const ARC_CHAIN_ID = 5042002
const ARC_CHAIN_ID_HEX = '0x4cef52'
const ARC_RPC_URL = 'https://rpc.testnet.arc.network'
const ARC_EXPLORER_URL = 'https://testnet.arcscan.app'
const FAUCET_URL = 'https://faucet.circle.com'
const CIRCLE_PROXY = 'https://arcagent-circle-proxy.arcagent.workers.dev/circle'
const CIRCLE_APP_ID = 'c0cc626d-f95a-5257-9e4d-e55ef5831aa4'

const CATEGORIES = ['Commerce', 'Freelance', 'API', 'Data', 'Content', 'Other']

const CATEGORY_COLORS = {
  'Commerce': '#d3ad34',
  'Freelance': '#3b82f6',
  'API': '#8b5cf6',
  'Data': '#10b981',
  'Content': '#f59e0b',
  'Other': '#6b7280'
}

const AGENT_ABI = [
  'function placeOrder(string memory item, uint256 amount, address receiver) returns (uint256)',
  'function executeOrder(uint256 orderId)',
  'function claimRefund(uint256 orderId)',
  'function getOrder(uint256 orderId) view returns (tuple(uint256 id, address buyer, address receiver, string item, uint256 amount, bool executed, bool refunded, uint256 timestamp, uint256 deadline))',
  'function orderCount() view returns (uint256)',
  'function getTimeRemaining(uint256 orderId) view returns (uint256)'
]

const TOKEN_ABI = [
  'function approve(address spender, uint256 amount) returns (bool)',
  'function balanceOf(address) view returns (uint256)'
]

const arcTestnet = {
  id: ARC_CHAIN_ID,
  name: 'Arc Testnet',
  chainNamespace: 'eip155',
  nativeCurrency: { name: 'USDC', symbol: 'USDC', decimals: 18 },
  rpcUrls: { default: { http: [ARC_RPC_URL] } },
  blockExplorers: { default: { name: 'ArcScan', url: ARC_EXPLORER_URL } }
}

const metadata = {
  name: 'ArcAgent',
  description: 'ArcAgent commerce app on Arc Testnet',
  url: window.location.origin,
  icons: [`${window.location.origin}/arcagent-logo.png`]
}

const ethersAdapter = new EthersAdapter()
createAppKit({
  adapters: [ethersAdapter],
  projectId: PROJECT_ID,
  metadata,
  networks: [arcTestnet],
  defaultNetwork: arcTestnet,
  features: { analytics: false }
})

document.querySelector('#app').innerHTML = `
  <div class="container">
    <header>
      <div class="top-brand-bar">
        <div class="top-brand-pill">
          <img src="/arcagent-logo.png" alt="ArcAgent Logo" class="top-brand-icon" />
          <span>arcagent</span>
        </div>
        <a href="./index.html" class="top-home-link">Home</a>
      </div>
      <div class="header-row">
        <div class="brand-wrap">
          <img src="/arcagent-logo.png" alt="ArcAgent Logo" class="brand-logo" />
          <div>
            <div class="eyebrow">Arc Testnet // Agentic Commerce</div>
            <h1>Arc<span>Agent</span></h1>
            <div class="tagline">// autonomous on-chain commerce protocol</div>
          </div>
        </div>
        <div class="wallet-panel">
          <div class="wallet-badge" id="walletBadge">
            <div class="dot"></div>
            <span id="walletAddr">Connected</span>
            <span id="walletBalance" style="font-size:11px;opacity:0.8;background:rgba(255,255,255,0.15);padding:3px 8px;border-radius:6px;">... USDC</span>
            <button id="disconnectBtn" class="mini-btn">Disconnect</button>
          </div>
          <button class="connect-btn" id="connectBtn">Connect Wallet</button>
          <div style="text-align:center;font-size:11px;color:#6b7280;margin:4px 0;">or</div>
          <button class="connect-btn" id="circleBtn" style="background:linear-gradient(180deg,#1a73e8 0%,#1557b0 100%);">
            ⊙ Connect with Circle
          </button>
          <div id="circleEmailWrap" style="display:none;margin-top:8px;">
            <input id="circleEmail" type="email" placeholder="Enter your email" style="width:100%;padding:12px;border:1px solid #dbe4ee;border-radius:12px;font-size:14px;background:#f5f8fb;" />
            <button class="connect-btn" id="circleSubmitBtn" style="margin-top:8px;background:linear-gradient(180deg,#1a73e8 0%,#1557b0 100%);">
              Create / Restore Wallet →
            </button>
          </div>
          <div id="circleStatus" class="status" style="display:none;margin-top:8px;"></div>
        </div>
      </div>
    </header>

    <div class="stats-row">
      <div class="stat-box">
        <div class="stat-num" id="statOrders">—</div>
        <div class="stat-label">Total Orders</div>
      </div>
      <div class="stat-box">
        <div class="stat-num" id="statPending">—</div>
        <div class="stat-label">Pending</div>
      </div>
      <div class="stat-box">
        <div class="stat-num" id="statExecuted">—</div>
        <div class="stat-label">Executed</div>
      </div>
    </div>

    <div class="tabs-row">
      <button class="tab-btn active" id="tabAll" onclick="switchTab('all')">All Orders</button>
      <button class="tab-btn" id="tabMine" onclick="switchTab('mine')">My Orders</button>
      <button class="tab-btn" id="tabPlace" onclick="switchTab('place')">Place Order</button>
    </div>

    <div id="tabContentAll">
      <div class="card full-card">
        <div class="card-title"><span>Recent Orders</span></div>
        <div class="orders-list" id="ordersList">
          <div class="empty-state">Loading recent orders...</div>
        </div>
      </div>
    </div>

    <div id="tabContentMine" style="display:none;">
      <div class="card full-card">
        <div class="card-title"><span>My Orders</span></div>
        <div id="myOrdersInfo" class="empty-state" style="margin-bottom:12px;display:none;">Connect wallet to see your orders.</div>
        <div class="orders-list" id="myOrdersList">
          <div class="empty-state">Connect wallet to see your orders.</div>
        </div>
      </div>
    </div>

    <div id="tabContentPlace" style="display:none;">
      <div class="grid">
        <div class="card">
          <div class="card-title"><span>Place Order</span></div>
          <div class="field">
            <label>Category</label>
            <select id="orderCategory">
              <option value="Commerce">Commerce</option>
              <option value="Freelance">Freelance</option>
              <option value="API">API</option>
              <option value="Data">Data</option>
              <option value="Content">Content</option>
              <option value="Other">Other</option>
            </select>
          </div>
          <div class="field">
            <label>Item Name</label>
            <input type="text" id="itemName" placeholder="e.g. Coffee, API Call..." />
          </div>
          <div class="field">
            <label>Amount (USDC)</label>
            <input type="number" id="orderAmount" placeholder="e.g. 10" />
          </div>
          <div class="field">
            <label>Receiver Address</label>
            <input type="text" id="receiverAddr" placeholder="0x... wallet to receive payment" />
          </div>
          <div class="help-box">
            <p class="helper-text">Arc Testnet uses USDC for gas and testing.</p>
            <a href="${FAUCET_URL}" target="_blank" rel="noopener noreferrer" class="helper-link">Get Test USDC</a>
          </div>
          <button class="action-btn" id="placeBtn">Place Order</button>
          <div class="status" id="placeStatus"></div>
        </div>

        <div class="card">
          <div class="card-title"><span>Execute Order</span></div>
          <div class="field">
            <label>Order ID</label>
            <input type="number" id="execOrderId" placeholder="e.g. 1" />
          </div>
          <div class="field">
            <label>Agent Action</label>
            <input type="text" value="AUTO_EXECUTE_PAYMENT" readonly />
          </div>
          <div class="help-box notice-box">
            <p class="helper-text notice-text">Only the approved agent wallet can execute orders.</p>
          </div>
          <button class="action-btn secondary" id="execBtn">Execute via Agent</button>
          <div class="status" id="execStatus"></div>
        </div>

        <div class="card">
          <div class="card-title"><span>Claim Refund</span></div>
          <div class="field">
            <label>Order ID</label>
            <input type="number" id="refundOrderId" placeholder="e.g. 1" />
          </div>
          <div class="help-box notice-box">
            <p class="helper-text notice-text">If agent does not execute within 24 hours, you can claim a full refund.</p>
          </div>
          <button class="action-btn refund" id="refundBtn">Claim Refund</button>
          <div class="status" id="refundStatus"></div>
        </div>

        <div class="card">
          <div class="card-title"><span>Lookup Order</span></div>
          <div class="field">
            <label>Order ID</label>
            <input type="number" id="lookupId" placeholder="e.g. 1" />
          </div>
          <button class="action-btn neutral" id="lookupBtn">Fetch Order</button>
          <div class="status" id="lookupStatus"></div>
        </div>
      </div>
    </div>

    <!-- Circle PIN iframe modal -->
    <div id="circleModal" style="display:none;position:fixed;inset:0;background:rgba(0,0,0,0.6);z-index:9999;align-items:center;justify-content:center;">
      <div style="background:#fff;border-radius:20px;width:420px;max-width:95vw;height:600px;max-height:90vh;overflow:hidden;position:relative;">
        <button onclick="document.getElementById('circleModal').style.display='none'" style="position:absolute;top:12px;right:14px;background:none;border:none;font-size:20px;cursor:pointer;z-index:1;">✕</button>
        <iframe id="circleIframe" src="" style="width:100%;height:100%;border:none;border-radius:20px;"></iframe>
      </div>
    </div>

  </div>
`

let browserProvider = null
let signer = null
let rawProvider = null
let connectedAddress = null
let circleUserToken = null
let circleWalletAddress = null
let circleWalletId = null

const connectBtn = document.getElementById('connectBtn')
const disconnectBtn = document.getElementById('disconnectBtn')
const walletBadge = document.getElementById('walletBadge')
const walletAddr = document.getElementById('walletAddr')
const circleBtn = document.getElementById('circleBtn')
const circleEmailWrap = document.getElementById('circleEmailWrap')
const circleSubmitBtn = document.getElementById('circleSubmitBtn')

connectBtn.addEventListener('click', connectWallet)
disconnectBtn.addEventListener('click', disconnectWallet)
document.getElementById('placeBtn').addEventListener('click', placeOrder)
document.getElementById('execBtn').addEventListener('click', executeOrder)
document.getElementById('refundBtn').addEventListener('click', claimRefund)
document.getElementById('lookupBtn').addEventListener('click', lookupOrder)

// ── Circle button logic ──────────────────────────────────────
circleBtn.addEventListener('click', () => {
  circleEmailWrap.style.display = circleEmailWrap.style.display === 'none' ? 'block' : 'none'
})

circleSubmitBtn.addEventListener('click', async () => {
  const email = document.getElementById('circleEmail').value.trim()
  if (!email) { showCircleStatus('Enter your email first.', 'error'); return }
  circleSubmitBtn.disabled = true
  await connectCircleWallet(email)
  circleSubmitBtn.disabled = false
})

function showCircleStatus(msg, type) {
  const el = document.getElementById('circleStatus')
  el.textContent = msg
  el.className = 'status ' + type
  el.style.display = 'block'
}

async function connectCircleWallet(email) {
  try {
    showCircleStatus('Creating your wallet...', 'loading')

    // Single call — server creates wallet instantly, no PIN needed
    const res = await fetch(`${CIRCLE_PROXY}/wallet`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: email })
    })
    const data = await res.json()

    if (!data?.address) {
      throw new Error(data?.error || 'Could not create wallet — is your proxy server running?')
    }

    circleWalletAddress = data.address
    circleWalletId = data.walletId
    onCircleConnected(circleWalletAddress)

  } catch (e) {
    console.error('[Circle]', e)
    showCircleStatus('❌ ' + e.message, 'error')
  }
}

function onCircleConnected(address) {
  connectedAddress = address
  walletBadge.style.display = 'flex'
  walletAddr.textContent = address.slice(0, 6) + '...' + address.slice(-4) + ' (Circle)'
  walletAddr.title = address
  walletAddr.style.cursor = 'pointer'
  walletAddr.onclick = () => {
    navigator.clipboard.writeText(address)
    walletAddr.textContent = 'Copied!'
    setTimeout(() => {
      walletAddr.textContent = address.slice(0, 6) + '...' + address.slice(-4) + ' (Circle)'
    }, 1500)
  }
  connectBtn.style.display = 'none'
  circleBtn.style.display = 'none'
  circleEmailWrap.style.display = 'none'
  showCircleStatus('✅ Circle wallet connected! Tap address to copy.', 'success')
  await Promise.all([loadStats(), loadRecentOrders()])

  // Show onboarding box for new users
  let onboardBox = document.getElementById('circleOnboard')
  if (!onboardBox) {
    onboardBox = document.createElement('div')
    onboardBox.id = 'circleOnboard'
    onboardBox.style.cssText = 'margin-top:10px;background:#fff8e8;border:1px solid #f0d080;border-radius:12px;padding:12px;font-size:12px;color:#8b6b19;line-height:1.7;'
    onboardBox.innerHTML = `
      <strong>🪙 Need test USDC?</strong><br>
      Your wallet address: <span id='fullAddrDisplay' style='font-family:monospace;font-size:11px;word-break:break-all;'>${address}</span><br>
      <div style='display:flex;gap:8px;margin-top:8px;flex-wrap:wrap;'>
        <button onclick="navigator.clipboard.writeText('${address}');this.textContent='✅ Copied!';setTimeout(()=>this.textContent='📋 Copy Address',1500)" 
          style='background:#f0b429;border:none;border-radius:8px;padding:7px 12px;font-size:11px;font-weight:700;cursor:pointer;'>
          📋 Copy Address
        </button>
        <a href='https://faucet.circle.com' target='_blank' 
          style='background:#4f6b86;color:#fff;border-radius:8px;padding:7px 12px;font-size:11px;font-weight:700;text-decoration:none;display:inline-flex;align-items:center;'>
          💧 Get Free USDC →
        </a>
      </div>
    `
    document.getElementById('circleStatus').after(onboardBox)
  }

  loadMyOrders()
}


// ── Circle transaction helper ─────────────────────────────────
async function circleSignAndSend(contractAddress, callData, value) {
  if (!circleWalletId) throw new Error('No Circle wallet connected')
  
  showStatus('placeStatus', 'Sending via Circle wallet...', 'loading')
  
  const res = await fetch(`${CIRCLE_PROXY}/transaction`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ walletId: circleWalletId, contractAddress, callData, value })
  })
  const data = await res.json()
  if (!data.success) throw new Error(data.error || 'Transaction failed')
  
  // Poll for completion
  let attempts = 0
  while (attempts < 30) {
    await new Promise(r => setTimeout(r, 2000))
    const pollRes = await fetch(`${CIRCLE_PROXY}/transaction/${data.txId}`)
    const pollData = await pollRes.json()
    const state = pollData?.data?.state
    console.log('[Circle] TX state:', state)
    if (state === 'COMPLETE') return { hash: pollData?.data?.txHash }
    if (state === 'FAILED' || state === 'CANCELLED') throw new Error('Transaction failed onchain')
    attempts++
  }
  throw new Error('Transaction timed out')
}

function switchTab(tab) {
  document.getElementById('tabContentAll').style.display = tab === 'all' ? 'block' : 'none'
  document.getElementById('tabContentMine').style.display = tab === 'mine' ? 'block' : 'none'
  document.getElementById('tabContentPlace').style.display = tab === 'place' ? 'block' : 'none'
  document.getElementById('tabAll').classList.toggle('active', tab === 'all')
  document.getElementById('tabMine').classList.toggle('active', tab === 'mine')
  document.getElementById('tabPlace').classList.toggle('active', tab === 'place')
  if (tab === 'mine') loadMyOrders()
}

window.switchTab = switchTab

async function connectWallet() {
  try {
    const provider = await getWalletProviderSafe()
    if (!provider) { showStatus('placeStatus', 'No wallet provider found after connect.', 'error'); return }
    rawProvider = provider
    browserProvider = new ethers.BrowserProvider(provider)
    await ensureArcNetwork(provider)
    await provider.request({ method: 'eth_requestAccounts' })
    signer = await browserProvider.getSigner()
    connectedAddress = await signer.getAddress()
    walletBadge.style.display = 'flex'
    walletAddr.textContent = connectedAddress.slice(0, 6) + '...' + connectedAddress.slice(-4)
    connectBtn.style.display = 'none'
    circleBtn.style.display = 'none'
    circleEmailWrap.style.display = 'none'
    showStatus('placeStatus', 'Wallet connected successfully.', 'success')
    await loadBalance()
    await loadStats()
    await loadRecentOrders()
  } catch (e) {
    showStatus('placeStatus', 'Connection failed: ' + (e?.message || e), 'error')
  }
}

async function loadBalance() {
  try {
    const readProvider = getReadProvider()
    const token = new ethers.Contract(TOKEN_ADDR, TOKEN_ABI, readProvider)
    const bal = await token.balanceOf(connectedAddress)
    const formatted = parseFloat(ethers.formatUnits(bal, 6)).toFixed(2)
    const balEl = document.getElementById('walletBalance')
    if (balEl) balEl.textContent = formatted + ' USDC'
  } catch (e) { console.error('loadBalance error:', e) }
}

async function getWalletProviderSafe() {
  try { if (window.ethereum) return window.ethereum } catch {}
  try {
    if (ethersAdapter && typeof ethersAdapter.getProvider === 'function') {
      const p = await ethersAdapter.getProvider()
      if (p) return p
    }
  } catch {}
  return null
}

async function ensureArcNetwork(provider) {
  try {
    await provider.request({ method: 'wallet_switchEthereumChain', params: [{ chainId: ARC_CHAIN_ID_HEX }] })
  } catch (e) {
    if (e?.code === 4902 || String(e?.message || '').toLowerCase().includes('unrecognized chain')) {
      await provider.request({
        method: 'wallet_addEthereumChain',
        params: [{ chainId: ARC_CHAIN_ID_HEX, chainName: 'Arc Testnet', rpcUrls: [ARC_RPC_URL], nativeCurrency: { name: 'USDC', symbol: 'USDC', decimals: 18 }, blockExplorerUrls: [ARC_EXPLORER_URL] }]
      })
    } else { throw e }
  }
}

function getReadProvider() {
  return browserProvider || new ethers.JsonRpcProvider(ARC_RPC_URL)
}

function getCategoryFromItem(item) {
  const lower = item.toLowerCase()
  if (lower.includes('[commerce]')) return 'Commerce'
  if (lower.includes('[freelance]')) return 'Freelance'
  if (lower.includes('[api]')) return 'API'
  if (lower.includes('[data]')) return 'Data'
  if (lower.includes('[content]')) return 'Content'
  return 'Other'
}

function cleanItemName(item) {
  return item.replace(/\[(commerce|freelance|api|data|content|other)\]/gi, '').trim()
}

function renderOrderItem(o) {
  const amt = parseFloat(ethers.formatUnits(o.amount, 6)).toFixed(2)
  let statusLabel = 'Pending', statusClass = 'pending'
  if (o.executed) { statusLabel = 'Done'; statusClass = 'executed' }
  if (o.refunded) { statusLabel = 'Refunded'; statusClass = 'refunded' }
  const category = getCategoryFromItem(o.item)
  const itemName = cleanItemName(o.item)
  const catColor = CATEGORY_COLORS[category] || '#6b7280'
  const date = new Date(Number(o.timestamp) * 1000).toLocaleDateString()
  return '<div class="order-item">' +
    '<div class="order-id">#' + Number(o.id) + '</div>' +
    '<div class="order-details">' +
      '<div class="order-item-name">' + itemName +
        '<span style="font-size:9px;padding:2px 8px;border-radius:4px;background:' + catColor + '22;color:' + catColor + ';border:1px solid ' + catColor + '44;margin-left:6px;letter-spacing:1px;text-transform:uppercase;">' + category + '</span>' +
      '</div>' +
      '<div class="order-meta">' + amt + ' USDC · ' + o.buyer.slice(0, 6) + '...' + o.buyer.slice(-4) + ' · ' + date + '</div>' +
    '</div>' +
    '<div class="order-status ' + statusClass + '">' + statusLabel + '</div>' +
  '</div>'
}

async function loadStats() {
  try {
    const readProvider = getReadProvider()
    const agent = new ethers.Contract(AGENT_ADDR, AGENT_ABI, readProvider)
    const total = Number(await agent.orderCount())
    const start = Math.max(1, total - 19)
    const ids = []
    for (let i = start; i <= total; i++) ids.push(i)
    const orders = await Promise.all(ids.map(i => agent.getOrder(i)))
    let pending = 0, executed = 0
    for (const o of orders) {
      if (o.executed) executed++
      else pending++
    }
    document.getElementById('statOrders').textContent = total
    document.getElementById('statPending').textContent = pending
    document.getElementById('statExecuted').textContent = executed
  } catch (e) { console.error('loadStats error:', e) }
}

async function loadRecentOrders() {
  try {
    const readProvider = getReadProvider()
    const agent = new ethers.Contract(AGENT_ADDR, AGENT_ABI, readProvider)
    const count = Number(await agent.orderCount())
    const list = document.getElementById('ordersList')
    if (count === 0) { list.innerHTML = '<div class="empty-state">No orders yet. Place one above.</div>'; return }
    list.innerHTML = '<div class="empty-state">Loading recent orders...</div>'
    const start = Math.max(1, count - 9)
    const ids = []
    for (let i = count; i >= start; i--) ids.push(i)
    const orders = await Promise.all(ids.map(i => agent.getOrder(i)))
    list.innerHTML = orders.map(o => renderOrderItem(o)).join('')
  } catch (e) {
    console.error('loadRecentOrders error:', e)
    document.getElementById('ordersList').innerHTML = '<div class="empty-state">Could not load orders.</div>'
  }
}

async function loadMyOrders() {
  const list = document.getElementById('myOrdersList')
  if (!connectedAddress) {
    list.innerHTML = '<div class="empty-state">Connect your wallet to see your orders.</div>'
    return
  }
  list.innerHTML = '<div class="empty-state">Loading your orders...</div>'
  try {
    const readProvider = getReadProvider()
    const agent = new ethers.Contract(AGENT_ADDR, AGENT_ABI, readProvider)
    const count = Number(await agent.orderCount())
    if (count === 0) { list.innerHTML = '<div class="empty-state">No orders found for your wallet.</div>'; return }
    const BATCH = 5
    const ids = []
    for (let i = count; i >= 1; i--) ids.push(i)
    let myOrders = []
    let loaded = false
    for (let b = 0; b < ids.length; b += BATCH) {
      const batch = ids.slice(b, b + BATCH)
      const results = await Promise.allSettled(batch.map(i => agent.getOrder(i)))
      for (const r of results) {
        if (r.status !== 'fulfilled') continue
        const o = r.value
        if (o.buyer.toLowerCase() === connectedAddress.toLowerCase() ||
            o.receiver.toLowerCase() === connectedAddress.toLowerCase()) {
          myOrders.push(o)
        }
      }
      if (myOrders.length > 0) {
        loaded = true
        list.innerHTML = myOrders.map(o => renderOrderItem(o)).join('')
        const info = document.getElementById('myOrdersInfo')
        if (info) {
          info.style.display = 'block'
          info.textContent = myOrders.length + ' order(s) found for ' + connectedAddress.slice(0, 6) + '...' + connectedAddress.slice(-4)
        }
      }
    }
    if (!loaded) {
      list.innerHTML = '<div class="empty-state">No orders found for your wallet yet.</div>'
    }
  } catch (e) {
    console.error('loadMyOrders error:', e)
    list.innerHTML = '<div class="empty-state">Could not load your orders. Check your connection and try again.</div>'
  }
}

async function placeOrder() {
  const item = document.getElementById('itemName').value.trim()
  const amt = document.getElementById('orderAmount').value
  const category = document.getElementById('orderCategory').value
  if (!signer && !circleWalletId) { showStatus('placeStatus', 'Connect wallet first.', 'error'); return }
  if (!item || !amt) { showStatus('placeStatus', 'Fill in all fields.', 'error'); return }
  const placeBtn = document.getElementById('placeBtn')
  placeBtn.disabled = true
  showStatus('placeStatus', 'Approving USDC...', 'loading')
  try {
    const parsed = parseFloat(amt)
    if (isNaN(parsed) || parsed <= 0) throw new Error('Enter a valid amount.')
    const receiver = document.getElementById('receiverAddr').value.trim()
    if (!receiver || !receiver.startsWith('0x')) throw new Error('Enter a valid receiver address.')
    const amount = ethers.parseUnits(String(parsed), 6)
    const itemWithCategory = '[' + category + '] ' + item

    let tx

    if (circleWalletId) {
      // ── Circle wallet path ──
      // Step 1: Approve USDC
      showStatus('placeStatus', 'Approving USDC via Circle...', 'loading')
      const tokenIface = new ethers.Interface(TOKEN_ABI)
      const approveData = tokenIface.encodeFunctionData('approve', [AGENT_ADDR, amount])
      await circleSignAndSend(TOKEN_ADDR, approveData)

      // Step 2: Place order
      showStatus('placeStatus', 'Placing order via Circle...', 'loading')
      const agentIface = new ethers.Interface(AGENT_ABI)
      const placeData = agentIface.encodeFunctionData('placeOrder', [itemWithCategory, amount, receiver])
      tx = await circleSignAndSend(AGENT_ADDR, placeData)

    } else {
      // ── MetaMask path ──
      const token = new ethers.Contract(TOKEN_ADDR, TOKEN_ABI, signer)
      const approveTx = await token.approve(AGENT_ADDR, amount)
      await approveTx.wait()
      showStatus('placeStatus', 'Placing order...', 'loading')
      const agent = new ethers.Contract(AGENT_ADDR, AGENT_ABI, signer)
      tx = await agent.placeOrder(itemWithCategory, amount, receiver)
      await tx.wait()
    }
    let newOrderId = null
    try { const updatedCount = await agent.orderCount(); newOrderId = Number(updatedCount) } catch {}
    const placeStatusEl = document.getElementById('placeStatus')
    placeStatusEl.className = 'status success'
    placeStatusEl.style.display = 'block'
    let html = '<div><strong>Order placed successfully.</strong></div>'
    if (newOrderId) {
      html += '<div style="margin-top:6px;"><strong>Order ID:</strong> #' + newOrderId + '</div>'
      html += '<button id="copyOrderIdBtn" type="button" style="margin-top:8px;">Copy Order ID</button>'
    }
    html += '<div style="margin-top:6px;"><strong>Tx:</strong> ' + tx.hash + '</div>'
    placeStatusEl.innerHTML = html
    if (newOrderId) {
      var copyBtn = document.getElementById('copyOrderIdBtn')
      if (copyBtn) {
        copyBtn.addEventListener('click', function() {
          navigator.clipboard.writeText(String(newOrderId)).then(function() {
            document.getElementById('copyOrderIdBtn').textContent = 'Copied!'
            setTimeout(function() {
              var b = document.getElementById('copyOrderIdBtn')
              if (b) b.textContent = 'Copy Order ID'
            }, 1500)
          })
        })
      }
      var lookupInput = document.getElementById('lookupId')
      var execInput = document.getElementById('execOrderId')
      var refundInput = document.getElementById('refundOrderId')
      if (lookupInput) lookupInput.value = String(newOrderId)
      if (execInput) execInput.value = String(newOrderId)
      if (refundInput) refundInput.value = String(newOrderId)
    }
    document.getElementById('itemName').value = ''
    document.getElementById('orderAmount').value = ''
    await loadBalance()
    await loadStats()
    await loadRecentOrders()
  } catch (e) {
    showStatus('placeStatus', 'Failed: ' + (e?.reason || e?.message || e), 'error')
  }
  placeBtn.disabled = false
}

async function executeOrder() {
  const id = document.getElementById('execOrderId').value
  const execBtn = document.getElementById('execBtn')
  if (!signer) { showStatus('execStatus', 'Connect wallet first.', 'error'); return }
  if (!id) { showStatus('execStatus', 'Enter an order ID.', 'error'); return }
  execBtn.disabled = true
  showStatus('execStatus', 'Agent executing order...', 'loading')
  try {
    const agent = new ethers.Contract(AGENT_ADDR, AGENT_ABI, signer)
    const tx = await agent.executeOrder(Number(id))
    await tx.wait()
    showStatus('execStatus', 'Order executed! Tx: ' + tx.hash, 'success')
    await loadStats()
    await loadRecentOrders()
  } catch (e) {
    showStatus('execStatus', 'Failed: ' + (e?.reason || e?.message || e), 'error')
  }
  execBtn.disabled = false
}

async function claimRefund() {
  const id = document.getElementById('refundOrderId').value
  const refundBtn = document.getElementById('refundBtn')
  if (!signer) { showStatus('refundStatus', 'Connect wallet first.', 'error'); return }
  if (!id) { showStatus('refundStatus', 'Enter an order ID.', 'error'); return }
  refundBtn.disabled = true
  showStatus('refundStatus', 'Checking deadline and claiming refund...', 'loading')
  try {
    const readProvider = getReadProvider()
    const agentRead = new ethers.Contract(AGENT_ADDR, AGENT_ABI, readProvider)
    const timeLeft = await agentRead.getTimeRemaining(Number(id))
    if (Number(timeLeft) > 0) {
      const hoursLeft = Math.ceil(Number(timeLeft) / 3600)
      showStatus('refundStatus', 'Deadline not reached yet. ' + hoursLeft + ' hour(s) remaining.', 'error')
      refundBtn.disabled = false
      return
    }
    const agent = new ethers.Contract(AGENT_ADDR, AGENT_ABI, signer)
    const tx = await agent.claimRefund(Number(id))
    await tx.wait()
    showStatus('refundStatus', 'Refund claimed! Tx: ' + tx.hash, 'success')
    await loadStats()
    await loadRecentOrders()
  } catch (e) {
    showStatus('refundStatus', 'Failed: ' + (e?.reason || e?.message || e), 'error')
  }
  refundBtn.disabled = false
}

async function lookupOrder() {
  const id = document.getElementById('lookupId').value
  if (!id) { showStatus('lookupStatus', 'Enter an order ID.', 'error'); return }
  try {
    const readProvider = getReadProvider()
    const agent = new ethers.Contract(AGENT_ADDR, AGENT_ABI, readProvider)
    const o = await agent.getOrder(Number(id))
    const amt = parseFloat(ethers.formatUnits(o.amount, 6)).toFixed(2)
    const date = new Date(Number(o.timestamp) * 1000).toLocaleString()
    const deadline = new Date(Number(o.deadline) * 1000).toLocaleString()
    const category = getCategoryFromItem(o.item)
    const itemName = cleanItemName(o.item)
    let status = 'Pending'
    if (o.executed) status = 'Executed'
    if (o.refunded) status = 'Refunded'
    showStatus('lookupStatus',
      'ID: #' + Number(o.id) + '\nCategory: ' + category + '\nItem: ' + itemName + '\nBuyer: ' + o.buyer + '\nReceiver: ' + o.receiver + '\nAmount: ' + amt + ' USDC\nStatus: ' + status + '\nPlaced: ' + date + '\nDeadline: ' + deadline,
      'success'
    )
  } catch (e) {
    showStatus('lookupStatus', 'Order not found.', 'error')
  }
}

function disconnectWallet() {
  browserProvider = null; signer = null; rawProvider = null; connectedAddress = null
  circleUserToken = null; circleWalletAddress = null
  walletBadge.style.display = 'none'
  connectBtn.style.display = 'block'
  circleBtn.style.display = 'block'
  document.getElementById('ordersList').innerHTML = '<div class="empty-state">Connect wallet to view orders</div>'
  document.getElementById('myOrdersList').innerHTML = '<div class="empty-state">Connect wallet to see your orders.</div>'
  document.getElementById('statOrders').textContent = '—'
  document.getElementById('statPending').textContent = '—'
  document.getElementById('statExecuted').textContent = '—'
  var info = document.getElementById('myOrdersInfo')
  if (info) info.style.display = 'none'
  document.getElementById('circleStatus').style.display = 'none'
}

function showStatus(id, msg, type) {
  var el = document.getElementById(id)
  if (!el) return
  el.textContent = msg
  el.className = 'status ' + type
  el.style.display = 'block'
}

async function init() {
  await Promise.all([loadStats(), loadRecentOrders()])
}
init()