<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import type { ApplicationStatus } from '~/types/ApplicationStatus';
import { ApplicationStatuses, ApplicationStatusIcons } from '~/types/ApplicationStatus';

definePageMeta({ layout: false })
useHead({ title: 'Job Tracker | Application Dashboard' })

interface Application {
  id: number
  company: string
  role: string
  status: ApplicationStatus
  appliedOn: string
  location: string
  notes: string,
  url: string
}

const storageKey = 'jobtracker-applications'
function localDateKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

function normalizeApplicationStatus(value: string): ApplicationStatus {
  return ApplicationStatuses.find(status => value === status || value.endsWith(` ${status}`)) ?? 'Applied'
}

const seedApplications: Application[] = [
  { id: 1, company: 'Linear', role: 'Product Designer', status: 'Interviewing', appliedOn: '2026-11-04', location: 'Remote', notes: 'Portfolio review with Maya on Friday', url: '' },
  { id: 2, company: 'Vercel', role: 'Product Designer', status: 'Applied', appliedOn: '2026-11-02', location: 'New York, NY', notes: '', url: 'https://linear.app/' },
  { id: 3, company: 'Figma', role: 'Design Engineer', status: 'Applied', appliedOn: '2026-10-30', location: 'Remote', notes: 'Follow up next week', url: 'https://vercel.com/' },
  { id: 4, company: 'Notion', role: 'Senior UX Designer', status: 'Offer', appliedOn: '2026-10-24', location: 'San Francisco, CA', notes: 'Decision due Nov 12', url: 'https://www.notion.com/' },
  { id: 5, company: 'Webflow', role: 'Product Designer', status: 'Rejected', appliedOn: '2026-10-19', location: 'Remote', notes: '', url: 'https://webflow.com/' },
]

const applications = ref<Application[]>(seedApplications)
const search = ref('')
const statusFilter = ref('All applications')
const isFormOpen = ref(false)
const editingId = ref<number | null>(null)
const form = ref({ company: '', role: '', status: 'Applied' as ApplicationStatus, appliedOn: localDateKey(new Date()), location: '', notes: '', url: '' })
const colorMode = useColorMode()
const isDarkMode = computed(() => colorMode.value === 'dark')

function toggleColorMode() {
  colorMode.preference = isDarkMode.value ? 'light' : 'dark'
}

onMounted(() => {
  try {
    const saved = localStorage.getItem(storageKey)
    if (saved) {
      applications.value = (JSON.parse(saved) as Application[]).map(application => ({
        ...application,
        status: normalizeApplicationStatus(application.status),
      }))
      saveApplications()
    }
  } catch {
    applications.value = seedApplications
  }
})

const filteredApplications = computed(() => {
  const query = search.value.trim().toLowerCase()
  return applications.value
    .filter(application => statusFilter.value === 'All applications' || application.status === statusFilter.value)
    .filter(application => !query || `${application.company} ${application.role} ${application.location}`.toLowerCase().includes(query))
    .sort((a, b) => b.appliedOn.localeCompare(a.appliedOn))
})

const counts = computed(() => ({
  total: applications.value.length,
  active: applications.value.filter(application => ['Applied', 'Interviewing'].includes(application.status)).length,
  interviews: applications.value.filter(application => application.status === 'Interviewing').length,
  offers: applications.value.filter(application => application.status === 'Offer').length,
  accepted: applications.value.filter(application => application.status === 'Accepted').length,
}))

const thisWeekCount = computed(() => {
  const today = new Date()
  const weekStart = new Date(today.getFullYear(), today.getMonth(), today.getDate())
  weekStart.setDate(weekStart.getDate() - ((weekStart.getDay() + 6) % 7))
  const startKey = localDateKey(weekStart)
  const endKey = localDateKey(today)
  return applications.value.filter(application => application.appliedOn >= startKey && application.appliedOn <= endKey).length
})

const headingDate = computed(() => new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }).toUpperCase())

const activity = computed(() => {
  const now = new Date()
  return Array.from({ length: 6 }, (_, index) => {
    const month = new Date(now.getFullYear(), now.getMonth() - 5 + index, 1)
    const count = applications.value.filter(application => {
      const date = new Date(`${application.appliedOn}T00:00:00`)
      return date.getFullYear() === month.getFullYear() && date.getMonth() === month.getMonth()
    }).length
    return { label: month.toLocaleDateString('en-US', { month: 'short' }), count }
  })
})

const maxActivity = computed(() => Math.max(1, ...activity.value.map(month => month.count)))

function saveApplications() {
  localStorage.setItem(storageKey, JSON.stringify(applications.value))
}

function openNewApplication() {
  editingId.value = null
  form.value = { company: '', role: '', status: 'Applied', appliedOn: localDateKey(new Date()), location: '', notes: '', url: '' }
  isFormOpen.value = true
}

function editApplication(application: Application) {
  editingId.value = application.id
  form.value = { ...application }
  isFormOpen.value = true
}

function submitApplication() {
  if (editingId.value === null) {
    applications.value.unshift({ id: Date.now(), ...form.value })
  } else {
    const index = applications.value.findIndex(application => application.id === editingId.value)
    if (index !== -1) applications.value[index] = { id: editingId.value, ...form.value }
  }
  saveApplications()
  isFormOpen.value = false
}

function updateStatus(application: Application, event: Event) {
  application.status = (event.target as HTMLSelectElement).value as ApplicationStatus
  saveApplications()
}

function removeApplication(id: number) {
  applications.value = applications.value.filter(application => application.id !== id)
  saveApplications()
}

function exportCsv() {
  const columns = ['Company', 'Role', 'Status', 'Applied on', 'Location', 'Notes', 'URL']
  const rows = applications.value.map(({ company, role, status, appliedOn, location, notes, url }) => [company, role, status, appliedOn, location, notes, url])
  const csv = [columns, ...rows].map(row => row.map(value => `"${String(value).replaceAll('"', '""')}"`).join(',')).join('\r\n')
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }))
  const link = document.createElement('a')
  link.href = url
  link.download = 'jobtracker-applications.csv'
  link.click()
  URL.revokeObjectURL(url)
}

function formatDate(value: string) {
  return new Date(`${value}T00:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}
</script>

<template>
  <main class="workspace">
    <aside class="sidebar">
      <a class="brand" href="#overview" aria-label="JobTracker home">
        <span class="brand-mark"><img src="/img/avatar-64.png" alt="JobTracker Logo" /></span>
        <span>Job Tracker</span>
      </a>

      <div class="sidebar-label">WORKSPACE</div>
      <a class="nav-link active" href="#overview"><span class="nav-icon">◫</span> Overview</a>
      <a class="nav-link" href="#applications"><span class="nav-icon">▤</span> Applications <span class="nav-count">{{ counts.total }}</span></a>
      <a class="nav-link" href="#activity"><span class="nav-icon">▥</span> Activity</a>

      <div class="sidebar-bottom">
        <div class="week-card">
          <div class="week-top"><span class="week-dot"></span> THIS WEEK</div>
          <strong>{{ thisWeekCount }} applications</strong>
          <span>Keep your momentum going.</span>
        </div>
        <!-- <div class="profile"><div class="avatar">JD</div><div><strong>John Doe</strong></div><span class="profile-more">···</span></div> -->
      </div>
    </aside>

    <section class="main-area" id="overview">
      <header class="topbar">
        <div class="breadcrumb">Workspace <span>/</span> Overview</div>
        <div class="top-actions">
          <button class="export-button" type="button" @click="exportCsv"><span aria-hidden="true">⇩</span>Export CSV</button>
          <button
            v-if="!colorMode.unknown"
            class="theme-toggle"
            type="button"
            :aria-label="isDarkMode ? 'Switch to light theme' : 'Switch to dark theme'"
            :title="isDarkMode ? 'Switch to light theme' : 'Switch to dark theme'"
            :aria-pressed="isDarkMode"
            @click="toggleColorMode"
          ><span aria-hidden="true">{{ isDarkMode ? '☀' : '☾' }}</span></button>
          <button class="add-button" type="button" @click="openNewApplication"><span aria-hidden="true">＋</span> Add application</button>
        </div>
      </header>

      <div class="content-wrap">
        <div class="page-heading">
          <div><p class="eyebrow">{{ headingDate }}</p><h1>Your search, <em>in motion.</em></h1><p class="intro">A clear view of every opportunity and what comes next.</p></div>
          <div class="heading-mark" aria-hidden="true">↗</div>
        </div>
        
        <section class="congratulations" aria-label="Congratulations" aria-live="polite" v-if="counts.accepted > 0">
          <div class="congratulations-content">
            <span class="congratulations-mark" aria-hidden="true">{{ ApplicationStatusIcons.Accepted }}</span>
            <div>
              <h2>Congratulations!</h2>
              <p>You've made great progress in your job search. Keep up the good work!</p>
            </div>
          </div>
        </section>

        <section class="stat-grid" aria-label="Application summary">
          <article class="stat-card total-stat"><div class="stat-label">TOTAL APPLICATIONS <span>↗</span></div><strong>{{ counts.total }}</strong><div class="stat-foot">Opportunities tracked</div></article>
          <article class="stat-card"><div class="stat-label">IN PROGRESS <span class="stat-symbol">◎</span></div><strong>{{ counts.active }}</strong><div class="stat-foot">Awaiting next steps</div></article>
          <article class="stat-card"><div class="stat-label">INTERVIEWS <span class="stat-symbol">↗</span></div><strong>{{ counts.interviews }}</strong><div class="stat-foot">Conversations underway</div></article>
          <article class="stat-card"><div class="stat-label">OFFERS <span class="stat-symbol">✳</span></div><strong>{{ counts.offers }}</strong><div class="stat-foot">A good place to be</div></article>
        </section>

        <section class="dashboard-grid">
          <article class="panel activity-panel" id="activity">
            <div class="panel-heading"><div><p class="section-kicker">YOUR PROGRESS</p><h2>Application activity</h2></div><span class="period-label">Last 6 months</span></div>
            <div class="chart" role="img" aria-label="Applications submitted by month for the last six months">
              <div v-for="month in activity" :key="month.label" class="chart-column">
                <span class="bar-value">{{ month.count || '' }}</span>
                <div class="bar-track"><div class="bar-fill" :style="{ height: `${month.count ? Math.max(7, month.count / maxActivity * 100) : 0}%` }"></div></div>
                <span class="bar-label">{{ month.label }}</span>
              </div>
            </div>
            <div class="chart-caption"><span><i></i> Applications sent</span><span>{{ counts.total }} total</span></div>
          </article>

          <article class="panel pipeline-panel">
            <div class="panel-heading"><div><p class="section-kicker">AT A GLANCE</p><h2>Your stats</h2></div></div>
            <div class="pipeline-list">
              <div v-for="status in ApplicationStatuses" :key="status" class="pipeline-row">
                <div class="pipeline-label"><span class="status-emoji" aria-hidden="true">{{ ApplicationStatusIcons[status] }}</span>{{ status }}<strong>{{ applications.filter(application => application.status === status).length }}</strong></div>
                <div class="pipeline-track"><div :class="['pipeline-fill', status]" :style="{ width: `${counts.total ? applications.filter(application => application.status === status).length / counts.total * 100 : 0}%` }"></div></div>
              </div>
            </div>
            <div class="pipeline-note">Every update brings the next step into focus.</div>
          </article>
        </section>

        <section class="panel applications-panel" id="applications">
          <div class="applications-heading">
            <div><p class="section-kicker">THE DETAILS</p><h2>Applications <span class="table-count">{{ filteredApplications.length }}</span></h2></div>
            <div class="table-tools">
              <label class="search-box"><span aria-hidden="true">⌕</span><input v-model="search" type="search" placeholder="Search roles or companies" aria-label="Search applications"></label>
              <select v-model="statusFilter" aria-label="Filter by status" class="filter-select"><option>All applications</option><option v-for="status in ApplicationStatuses" :key="status">{{ status }}</option></select>
            </div>
          </div>
          <div class="table-scroll">
            <table>
              <thead><tr><th>COMPANY / ROLE</th><th>STATUS</th><th>DATE APPLIED</th><th>LOCATION</th><th>URL</th><th><span class="sr-only">Actions</span></th></tr></thead>
              <tbody>
                <tr v-for="application in filteredApplications" :key="application.id">
                  <td><button class="company-cell" type="button" @click="editApplication(application)"><span class="company-avatar" :class="`company-${application.id % 5}`">{{ application.company.slice(0, 1) }}</span><span><strong>{{ application.company }}</strong><small>{{ application.role }}</small></span></button></td>
                  <td><div :class="['status-control', application.status]"><select :value="application.status" class="status-select" :aria-label="`Status for ${application.company}`" @change="updateStatus(application, $event)"><option v-for="status in ApplicationStatuses" :key="status" :value="status">{{ ApplicationStatusIcons[status] }} {{ status }}</option></select></div></td>
                  <td class="date-cell">{{ formatDate(application.appliedOn) }}</td>
                  <td class="location-cell">{{ application.location || '—' }}</td>
                  <td class="url-cell"><a v-if="application.url" :href="application.url" target="_blank" rel="noopener noreferrer">Visit</a><span v-else>—</span></td>
                  <td><div class="row-actions"><button type="button" :aria-label="`Edit ${application.company}`" title="Edit application" @click="editApplication(application)">↗</button><button type="button" :aria-label="`Delete ${application.company}`" title="Delete application" @click="removeApplication(application.id)">×</button></div></td>
                </tr>
                <tr v-if="filteredApplications.length === 0"><td colspan="5" class="empty-state">No applications found. Add one to start your tracker.</td></tr>
              </tbody>
            </table>
          </div>
          <div class="table-footer"><span>Showing {{ filteredApplications.length }} of {{ counts.total }} applications</span><button type="button" class="footer-export" @click="exportCsv">Export data <span>↗</span></button></div>
        </section>
        <footer class="page-footer"><span>One step at a time.</span><span>Built for the in-between.</span></footer>
      </div>
    </section>

    <div v-if="isFormOpen" class="modal-backdrop" @click.self="isFormOpen = false" @keydown.esc="isFormOpen = false">
      <form class="application-form" @submit.prevent="submitApplication">
        <div class="form-heading"><div><p class="section-kicker">{{ editingId === null ? 'NEW OPPORTUNITY' : 'UPDATE DETAILS' }}</p><h2>{{ editingId === null ? 'Add an application' : 'Edit application' }}</h2></div><button class="close-button" type="button" aria-label="Close" @click="isFormOpen = false">×</button></div>
        <label>Company name<input v-model.trim="form.company" required placeholder="e.g. Acme Studio"></label>
        <label>Role title<input v-model.trim="form.role" required placeholder="e.g. Product Designer"></label>
        <div class="form-row"><label>Status<select v-model="form.status"><option v-for="status in ApplicationStatuses" :key="status">{{ status }}</option></select></label><label>Date applied<input v-model="form.appliedOn" type="date" required></label></div>
        <label>Location<input v-model.trim="form.location" placeholder="Remote or city"></label>
        <label>URL<input v-model.trim="form.url" placeholder="Link"></label>
        <label>Notes<textarea v-model.trim="form.notes" rows="3" placeholder="A reminder for your future self"></textarea></label>
        <div class="form-actions"><button class="cancel-button" type="button" @click="isFormOpen = false">Cancel</button><button class="add-button" type="submit">{{ editingId === null ? 'Save application' : 'Save changes' }}</button></div>
      </form>
    </div>
  </main>
</template>

<style>
.status-icon {
  display: inline-grid;
  flex: 0 0 16px;
  width: 16px;
  height: 16px;
  place-items: center;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 700;
  line-height: 1;
}

.status-icon.applied { color: #68736a; }
.status-icon.interviewing { color: #a27736; }
.status-icon.offer { color: #628541; }
.status-icon.rejected { color: #a36761; }

.status-control {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.status-control .status-icon { flex-basis: 12px; width: 12px; }
.select-caret { color: #879088; font-size: 10px; pointer-events: none; }
</style>