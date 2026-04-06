import './style.css'
import { ethers } from 'ethers'
import { createAppKit } from '@reown/appkit'
import { EthersAdapter } from '@reown/appkit-adapter-ethers'

const PROJECT_ID = '3f606d90e27edfdd5d9d6b7f3a469448'

const AGENT_ADDR = '0x880A0e6c1eD42E1B1C3ce70f51aE6d0314911c52'
const TOKEN_ADDR = '0x7888Da753f5D964987931741C8ca2044F6c1c463'
const ARC_CHAIN_ID = 5042002
const ARC_CHAIN_ID_HEX = '0x4CEF52'
const ARC_RPC_URL = 'https://rpc.testnet.arc.network'
const ARC_EXPLORER_URL = 'https://testnet.arcscan.app'

const AGENT_ABI = [
  'function placeOrder(string memory item, uint256 amount) returns (uint256)',
  'function executeOrder(uint256 orderId)',
  'function getOrder(uint256 orderId) view returns (tuple(uint256 id, address buyer, string item, uint256 amount, bool executed, uint256 timestamp))',
  'function orderCount() view returns (uint256)'
]

const TOKEN_ABI = [
  'function approve(address spender, uint256 amount) returns (bool)',
  'function balanceOf(address) view returns (uint256)'
]

const arcTestnet = {
  id: ARC_CHAIN_ID,
  name: 'Arc Testnet',
  chainNamespace: 'eip155',
  nativeCurrency: {
    name: 'USDC',
    symbol: 'USDC',
    decimals: 18
  },
  rpcUrls: {
    default: {
      http: [ARC_RPC_URL]
    }
  },
  blockExplorers: {
    default: {
      name: 'ArcScan',
      url: ARC_EXPLORER_URL
    }
  }
}

const metadata = {
  name: 'ArcAgent',
  description: 'ArcAgent commerce app on Arc Testnet',
  url: window.location.origin,
  icons: [`${window.location.origin}/arcagent-logo.png`]
}

const ethersAdapter = new EthersAdapter()

const modal = createAppKit({
  adapters: [ethersAdapter],
  projectId: PROJECT_ID,
  metadata,
  networks: [arcTestnet],
  defaultNetwork: arcTestnet,
  features: {
    analytics: false
  }
})

document.querySelector('#app').innerHTML = `
  <div class="container">
    <header>
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
            <button id="disconnectBtn" class="mini-btn">Disconnect</button>
          </div>
          <button class="connect-btn" id="connectBtn">Connect Wallet</button>
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

    <div class="grid">
      <div class="card">
        <div class="card-title"><span>Place Order</span></div>
        <div class="field">
          <label>Item Name</label>
          <input type="text" id="itemName" placeholder="e.g. Coffee, API Call..." />
        </div>
        <div class="field">
          <label>Amount (ART tokens)</label>
          <input type="number" id="orderAmount" placeholder="e.g. 10" />
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
        <button class="action-btn secondary" id="execBtn">Execute via Agent</button>
        <div class="status" id="execStatus"></div>
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

      <div class="card">
        <div class="card-title"><span>Recent Orders</span></div>
        <div class="orders-list" id="ordersList">
          <div class="empty-state">Loading recent orders...</div>
        </div>
      </div>
    </div>
  </div>
`

let browserProvider = null
let signer = null
let rawProvider = null
let connectedAddress = null

const connectBtn = document.getElementById('connectBtn')
const disconnectBtn = document.getElementById('disconnectBtn')
const walletBadge = document.getElementById('walletBadge')
const walletAddr = document.getElementById('walletAddr')

connectBtn.addEventListener('click', connectWallet)
disconnectBtn.addEventListener('click', disconnectWallet)
document.getElementById('placeBtn').addEventListener('click', placeOrder)
document.getElementById('execBtn').addEventListener('click', executeOrder)
document.getElementById('lookupBtn').addEventListener('click', lookupOrder)

async function connectWallet() {
  try {
    await modal.open()

    const provider = await getWalletProviderSafe()
    if (!provider) {
      showStatus('placeStatus', 'No wallet provider found after connect.', 'error')
      return
    }

    rawProvider = provider
    browserProvider = new ethers.BrowserProvider(provider)

    await ensureArcNetwork(provider)

    signer = await browserProvider.getSigner()
    connectedAddress = await signer.getAddress()

    walletBadge.style.display = 'flex'
    walletAddr.textContent = `${connectedAddress.slice(0, 6)}...${connectedAddress.slice(-4)}`
    connectBtn.style.display = 'none'

    showStatus('placeStatus', 'Wallet connected successfully.', 'success')
    await loadStats()
    await loadRecentOrders()
  } catch (e) {
    showStatus('placeStatus', `Connection failed: ${e?.message || e}`, 'error')
  }
}

async function getWalletProviderSafe() {
  try {
    if (typeof modal.getWalletProvider === 'function') {
      const p = await modal.getWalletProvider()
      if (p) return p
    }
  } catch {}

  try {
    if (typeof modal.getProvider === 'function') {
      const p = await modal.getProvider()
      if (p) return p
    }
  } catch {}

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
    await provider.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: ARC_CHAIN_ID_HEX }]
    })
  } catch (e) {
    if (e?.code === 4902 || String(e?.message || '').toLowerCase().includes('unrecognized chain')) {
      await provider.request({
        method: 'wallet_addEthereumChain',
        params: [{
          chainId: ARC_CHAIN_ID_HEX,
          chainName: 'Arc Testnet',
          rpcUrls: [ARC_RPC_URL],
          nativeCurrency: {
            name: 'USDC',
            symbol: 'USDC',
            decimals: 18
          },
          blockExplorerUrls: [ARC_EXPLORER_URL]
        }]
      })
    } else {
      throw e
    }
  }
}

function getReadProvider() {
  return browserProvider || new ethers.JsonRpcProvider(ARC_RPC_URL)
}

async function loadStats() {
  try {
    const readProvider = getReadProvider()
    const agent = new ethers.Contract(AGENT_ADDR, AGENT_ABI, readProvider)
    const total = Number(await agent.orderCount())

    let pending = 0
    let executed = 0
    const start = Math.max(1, total - 19)

    for (let i = start; i <= total; i++) {
      const o = await agent.getOrder(i)
      if (o.executed) executed++
      else pending++
    }

    document.getElementById('statOrders').textContent = total
    document.getElementById('statPending').textContent = pending
    document.getElementById('statExecuted').textContent = executed
  } catch (e) {
    console.error('loadStats error:', e)
  }
}

async function loadRecentOrders() {
  try {
    const readProvider = getReadProvider()
    const agent = new ethers.Contract(AGENT_ADDR, AGENT_ABI, readProvider)
    const count = Number(await agent.orderCount())
    const list = document.getElementById('ordersList')

    if (count === 0) {
      list.innerHTML = '<div class="empty-state">No orders yet. Place one above.</div>'
      return
    }

    list.innerHTML = ''
    const start = Math.max(1, count - 4)

    for (let i = count; i >= start; i--) {
      const o = await agent.getOrder(i)
      const amt = parseFloat(ethers.formatUnits(o.amount, 18)).toFixed(2)

      list.innerHTML += `
        <div class="order-item">
          <div class="order-id">#${Number(o.id)}</div>
          <div class="order-details">
            <div class="order-item-name">${o.item}</div>
            <div class="order-meta">${amt} ART · ${o.buyer.slice(0, 6)}...${o.buyer.slice(-4)}</div>
          </div>
          <div class="order-status ${o.executed ? 'executed' : 'pending'}">${o.executed ? 'Done' : 'Pending'}</div>
        </div>
      `
    }
  } catch (e) {
    console.error('loadRecentOrders error:', e)
    document.getElementById('ordersList').innerHTML = '<div class="empty-state">Could not load orders.</div>'
  }
}

async function placeOrder() {
  const item = document.getElementById('itemName').value.trim()
  const amt = document.getElementById('orderAmount').value

  if (!signer) {
    showStatus('placeStatus', 'Connect wallet first.', 'error')
    return
  }

  if (!item || !amt) {
    showStatus('placeStatus', 'Fill in all fields.', 'error')
    return
  }

  const placeBtn = document.getElementById('placeBtn')
  placeBtn.disabled = true
  showStatus('placeStatus', 'Approving tokens...', 'loading')

  try {
    const parsed = parseFloat(amt)
    if (isNaN(parsed) || parsed <= 0) throw new Error('Enter a valid amount.')

    const amount = ethers.parseUnits(String(Math.floor(parsed)), 18)

    const token = new ethers.Contract(TOKEN_ADDR, TOKEN_ABI, signer)
    const approveTx = await token.approve(AGENT_ADDR, amount)
    await approveTx.wait()

    showStatus('placeStatus', 'Placing order...', 'loading')

    const agent = new ethers.Contract(AGENT_ADDR, AGENT_ABI, signer)
    const tx = await agent.placeOrder(item, amount)
    await tx.wait()

    showStatus('placeStatus', `✓ Order placed! Tx: ${tx.hash}`, 'success')
    document.getElementById('itemName').value = ''
    document.getElementById('orderAmount').value = ''

    await loadStats()
    await loadRecentOrders()
  } catch (e) {
    showStatus('placeStatus', `Failed: ${e?.reason || e?.message || e}`, 'error')
  }

  placeBtn.disabled = false
}

async function executeOrder() {
  const id = document.getElementById('execOrderId').value
  const execBtn = document.getElementById('execBtn')

  if (!signer) {
    showStatus('execStatus', 'Connect wallet first.', 'error')
    return
  }

  if (!id) {
    showStatus('execStatus', 'Enter an order ID.', 'error')
    return
  }

  execBtn.disabled = true
  showStatus('execStatus', 'Agent executing order...', 'loading')

  try {
    const agent = new ethers.Contract(AGENT_ADDR, AGENT_ABI, signer)
    const tx = await agent.executeOrder(Number(id))
    await tx.wait()

    showStatus('execStatus', `✓ Order executed! Tx: ${tx.hash}`, 'success')
    await loadStats()
    await loadRecentOrders()
  } catch (e) {
    showStatus('execStatus', `Failed: ${e?.reason || e?.message || e}`, 'error')
  }

  execBtn.disabled = false
}

async function lookupOrder() {
  const id = document.getElementById('lookupId').value

  if (!id) {
    showStatus('lookupStatus', 'Enter an order ID.', 'error')
    return
  }

  try {
    const readProvider = getReadProvider()
    const agent = new ethers.Contract(AGENT_ADDR, AGENT_ABI, readProvider)
    const o = await agent.getOrder(Number(id))
    const amt = parseFloat(ethers.formatUnits(o.amount, 18)).toFixed(4)
    const date = new Date(Number(o.timestamp) * 1000).toLocaleString()

    showStatus(
      'lookupStatus',
      `ID: #${Number(o.id)}\nItem: ${o.item}\nBuyer: ${o.buyer}\nAmount: ${amt} ART\nStatus: ${o.executed ? '✓ Executed' : '⏳ Pending'}\nTime: ${date}`,
      'success'
    )
  } catch {
    showStatus('lookupStatus', 'Order not found.', 'error')
  }
}

function disconnectWallet() {
  browserProvider = null
  signer = null
  rawProvider = null
  connectedAddress = null

  walletBadge.style.display = 'none'
  connectBtn.style.display = 'block'
  document.getElementById('ordersList').innerHTML = "<div class='empty-state'>Connect wallet to view orders</div>"
  document.getElementById('statOrders').textContent = '—'
  document.getElementById('statPending').textContent = '—'
  document.getElementById('statExecuted').textContent = '—'
}

function showStatus(id, msg, type) {
  const el = document.getElementById(id)
  el.textContent = msg
  el.className = `status ${type}`
  el.style.display = 'block'
}

await loadStats()
await loadRecentOrders()