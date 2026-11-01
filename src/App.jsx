import { useEffect, useMemo, useState } from 'react';
import { BrowserRouter, Link, NavLink, Navigate, Route, Routes, useLocation, useNavigate, useParams } from 'react-router-dom';

const DEFAULT_DATA = {
  users: [
    {
      id: 'admin-1',
      fullName: 'Campus Admin',
      email: 'admin@campusfind.edu',
      password: 'admin123',
      role: 'admin',
      status: 'Active',
      department: 'Administration',
      campus: 'Main Campus',
      createdAt: new Date().toISOString(),
      approvedBy: 'system',
      approvedAt: new Date().toISOString(),
    },
    {
      id: 'mod-1',
      fullName: 'Campus Security',
      email: 'security@campusfind.edu',
      password: 'mod123',
      role: 'moderator',
      status: 'Active',
      department: 'Security',
      campus: 'Main Campus',
      createdAt: new Date().toISOString(),
      approvedBy: 'admin-1',
      approvedAt: new Date().toISOString(),
    },
  ],
  reports: [],
  claims: [],
  notifications: [],
  conversations: [],
  messages: [],
  auditLogs: [
    {
      id: 'audit-1',
      actor: 'admin-1',
      action: 'System initialized',
      entity: 'CampusFind',
      timestamp: new Date().toISOString(),
      context: 'Application bootstrapped with initial admin configuration',
    },
  ],
  settings: {
    campuses: ['Main Campus', 'North Campus', 'South Campus'],
    categories: ['Electronics', 'Wallets & purses', 'Keys & access cards', 'Student IDs', 'Books & notebooks', 'Clothing & accessories', 'Other'],
    approvedDomains: ['campusfind.edu', 'student.edu', 'staff.edu'],
  },
};

const uid = (prefix) => `${prefix}-${Math.random().toString(36).slice(2, 10)}`;

const loadData = () => {
  try {
    const raw = localStorage.getItem('campusfind_data');
    if (!raw) {
      localStorage.setItem('campusfind_data', JSON.stringify(DEFAULT_DATA));
      return DEFAULT_DATA;
    }
    return JSON.parse(raw);
  } catch {
    return DEFAULT_DATA;
  }
};

const formatDate = (value) => {
  if (!value) return '—';
  return new Date(value).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' });
};

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

function App() {
  const [data, setData] = useState(loadData);
  const [currentUserId, setCurrentUserId] = useState(() => localStorage.getItem('campusfind_session') || null);
  const [flash, setFlash] = useState(null);

  useEffect(() => {
    localStorage.setItem('campusfind_data', JSON.stringify(data));
  }, [data]);

  useEffect(() => {
    if (currentUserId) {
      localStorage.setItem('campusfind_session', currentUserId);
    } else {
      localStorage.removeItem('campusfind_session');
    }
  }, [currentUserId]);

  const currentUser = data.users.find((user) => user.id === currentUserId) || null;

  const addNotification = (userId, message, type = 'info') => {
    setData((prev) => ({
      ...prev,
      notifications: [
        {
          id: uid('note'),
          userId,
          message,
          type,
          read: false,
          createdAt: new Date().toISOString(),
        },
        ...prev.notifications,
      ],
    }));
  };

  const logAudit = (actor, action, entity, context) => {
    setData((prev) => ({
      ...prev,
      auditLogs: [
        {
          id: uid('audit'),
          actor,
          action,
          entity,
          timestamp: new Date().toISOString(),
          context,
        },
        ...prev.auditLogs,
      ],
    }));
  };

  const handleSignIn = (email, password) => {
    const match = data.users.find(
      (user) => user.email.toLowerCase() === email.toLowerCase() && user.password === password
    );

    if (!match) {
      return { success: false, message: 'No matching account was found. Check your email and password.' };
    }

    if (match.status !== 'Active') {
      setCurrentUserId(match.id);
      return { success: true, redirect: '/awaiting-approval' };
    }

    setCurrentUserId(match.id);
    return { success: true, redirect: '/dashboard' };
  };

  const handleSignUp = (payload) => {
    const exists = data.users.some(
      (user) => user.email.toLowerCase() === payload.email.toLowerCase()
    );
    if (exists) {
      return { success: false, message: 'An account already exists with that email.' };
    }

    const newUser = {
      id: uid('user'),
      fullName: payload.fullName,
      email: payload.email,
      password: payload.password,
      role: 'student',
      status: 'Pending Approval',
      department: payload.department,
      campus: payload.campus,
      createdAt: new Date().toISOString(),
      approvedBy: null,
      approvedAt: null,
      rejectionReason: null,
    };

    setData((prev) => ({
      ...prev,
      users: [...prev.users, newUser],
      notifications: [
        {
          id: uid('note'),
          userId: 'admin-1',
          message: `New user registration pending approval: ${newUser.fullName}`,
          type: 'alert',
          read: false,
          createdAt: new Date().toISOString(),
        },
        ...prev.notifications,
      ],
      auditLogs: [
        {
          id: uid('audit'),
          actor: newUser.id,
          action: 'User registered',
          entity: 'users',
          timestamp: new Date().toISOString(),
          context: 'New account created and awaiting approval',
        },
        ...prev.auditLogs,
      ],
    }));

    return {
      success: true,
      message: 'Your account has been created and is awaiting administrator approval. You will be notified once it is activated.',
    };
  };

  const handleAddReport = (report) => {
    const newReport = {
      ...report,
      id: uid('report'),
      ref: `${report.type === 'lost' ? 'L' : 'F'}-${Math.floor(1000 + Math.random() * 9000)}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      status: 'Pending Review',
      ownerId: currentUserId,
      visible: false,
      approvedBy: null,
      claimCount: 0,
      image: report.image || '',
    };

    setData((prev) => ({
      ...prev,
      reports: [newReport, ...prev.reports],
      notifications: [
        {
          id: uid('note'),
          userId: currentUserId,
          message: `${report.type === 'lost' ? 'Lost' : 'Found'} item report submitted successfully.`,
          type: 'success',
          read: false,
          createdAt: new Date().toISOString(),
        },
        ...prev.notifications,
      ],
      auditLogs: [
        {
          id: uid('audit'),
          actor: currentUserId,
          action: 'Report created',
          entity: 'reports',
          timestamp: new Date().toISOString(),
          context: `New ${report.type} report created (${newReport.ref})`,
        },
        ...prev.auditLogs,
      ],
    }));
  };

  const handleApproveUser = (userId) => {
    setData((prev) => ({
      ...prev,
      users: prev.users.map((user) =>
        user.id === userId
          ? { ...user, status: 'Active', approvedBy: currentUserId, approvedAt: new Date().toISOString() }
          : user
      ),
      notifications: [
        {
          id: uid('note'),
          userId,
          message: 'Your CampusFind account has been approved. You can now sign in.',
          type: 'success',
          read: false,
          createdAt: new Date().toISOString(),
        },
        ...prev.notifications,
      ],
      auditLogs: [
        {
          id: uid('audit'),
          actor: currentUserId,
          action: 'User approved',
          entity: 'users',
          timestamp: new Date().toISOString(),
          context: `User ${userId} approved`,
        },
        ...prev.auditLogs,
      ],
    }));
  };

  const handleRejectUser = (userId, reason) => {
    setData((prev) => ({
      ...prev,
      users: prev.users.map((user) =>
        user.id === userId
          ? { ...user, status: 'Rejected', rejectionReason: reason }
          : user
      ),
      notifications: [
        {
          id: uid('note'),
          userId,
          message: `Your account was not approved. ${reason || 'Please contact support.'}`,
          type: 'warning',
          read: false,
          createdAt: new Date().toISOString(),
        },
        ...prev.notifications,
      ],
      auditLogs: [
        {
          id: uid('audit'),
          actor: currentUserId,
          action: 'User rejected',
          entity: 'users',
          timestamp: new Date().toISOString(),
          context: `User ${userId} rejected: ${reason || 'No reason provided'}`,
        },
        ...prev.auditLogs,
      ],
    }));
  };

  const handleReportDecision = (reportId, status, note = '') => {
    setData((prev) => ({
      ...prev,
      reports: prev.reports.map((report) =>
        report.id === reportId
          ? {
              ...report,
              status,
              visible: status === 'Published' || status === 'Matched',
              approvedBy: currentUserId,
              updatedAt: new Date().toISOString(),
            }
          : report
      ),
      notifications: [
        {
          id: uid('note'),
          userId: prev.reports.find((r) => r.id === reportId)?.ownerId,
          message: `Your report ${reportId} was updated to ${status}. ${note}`,
          type: 'info',
          read: false,
          createdAt: new Date().toISOString(),
        },
        ...prev.notifications,
      ],
      auditLogs: [
        {
          id: uid('audit'),
          actor: currentUserId,
          action: 'Report status updated',
          entity: 'reports',
          timestamp: new Date().toISOString(),
          context: `Report ${reportId} changed to ${status}${note ? ` (${note})` : ''}`,
        },
        ...prev.auditLogs,
      ],
    }));
  };

  const handleSubmitClaim = (reportId, payload) => {
    const newClaim = {
      id: uid('claim'),
      reportId,
      userId: currentUserId,
      explanation: payload.explanation,
      traits: payload.traits,
      method: payload.method,
      status: 'Submitted',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    setData((prev) => ({
      ...prev,
      claims: [newClaim, ...prev.claims],
      reports: prev.reports.map((report) =>
        report.id === reportId ? { ...report, status: 'Claim Pending', updatedAt: new Date().toISOString() } : report
      ),
      notifications: [
        {
          id: uid('note'),
          userId: prev.reports.find((r) => r.id === reportId)?.ownerId,
          message: 'You have a new ownership claim for an item you reported.',
          type: 'alert',
          read: false,
          createdAt: new Date().toISOString(),
        },
        ...prev.notifications,
      ],
      auditLogs: [
        {
          id: uid('audit'),
          actor: currentUserId,
          action: 'Claim submitted',
          entity: 'claims',
          timestamp: new Date().toISOString(),
          context: `Claim created for report ${reportId}`,
        },
        ...prev.auditLogs,
      ],
    }));
  };

  const handleClaimDecision = (claimId, status, note = '') => {
    setData((prev) => ({
      ...prev,
      claims: prev.claims.map((claim) =>
        claim.id === claimId ? { ...claim, status, updatedAt: new Date().toISOString() } : claim
      ),
      notifications: [
        {
          id: uid('note'),
          userId: prev.claims.find((c) => c.id === claimId)?.userId,
          message: `Your claim status is now ${status}. ${note}`,
          type: 'info',
          read: false,
          createdAt: new Date().toISOString(),
        },
        ...prev.notifications,
      ],
      auditLogs: [
        {
          id: uid('audit'),
          actor: currentUserId,
          action: 'Claim reviewed',
          entity: 'claims',
          timestamp: new Date().toISOString(),
          context: `Claim ${claimId} set to ${status}${note ? ` (${note})` : ''}`,
        },
        ...prev.auditLogs,
      ],
    }));
  };

  const markNotificationRead = (notificationId) => {
    setData((prev) => ({
      ...prev,
      notifications: prev.notifications.map((note) =>
        note.id === notificationId ? { ...note, read: true } : note
      ),
    }));
  };

  const createConversation = (participantIds) => {
    const newConversation = {
      id: uid('conversation'),
      participants: participantIds,
      createdAt: new Date().toISOString(),
    };
    setData((prev) => ({
      ...prev,
      conversations: [...prev.conversations, newConversation],
    }));
    return newConversation.id;
  };

  const addMessage = (conversationId, text) => {
    const message = {
      id: uid('msg'),
      conversationId,
      senderId: currentUserId,
      text,
      createdAt: new Date().toISOString(),
    };
    setData((prev) => ({
      ...prev,
      messages: [...prev.messages, message],
    }));
  };

  if (!currentUser && location.pathname !== '/') {
    // handled by route guards below
  }

  const openReports = data.reports.filter((report) => report.status !== 'Closed' && report.status !== 'Returned' && report.status !== 'Rejected');
  const activeLost = openReports.filter((r) => r.type === 'lost');
  const activeFound = openReports.filter((r) => r.type === 'found');
  const pendingClaims = data.claims.filter((claim) => ['Submitted', 'Under Review', 'Additional Information Requested'].includes(claim.status));

  return (
    <BrowserRouter>
      <AppShell
        currentUser={currentUser}
        data={data}
        pendingClaims={pendingClaims}
        onSignOut={() => setCurrentUserId(null)}
        setFlash={setFlash}
        activeLost={activeLost.length}
        activeFound={activeFound.length}
        onMarkRead={markNotificationRead}
        onReportDecision={handleReportDecision}
        onApproveUser={handleApproveUser}
        onRejectUser={handleRejectUser}
        onClaimDecision={handleClaimDecision}
        handleAddReport={handleAddReport}
        handleSignUp={handleSignUp}
        handleSignIn={handleSignIn}
        handleSubmitClaim={handleSubmitClaim}
        createConversation={createConversation}
        addMessage={addMessage}
        logAudit={logAudit}
        addNotification={addNotification}
      />
      {flash && <div className="toast">{flash}</div>}
    </BrowserRouter>
  );
}

function AppShell({
  currentUser,
  data,
  pendingClaims,
  onSignOut,
  setFlash,
  activeLost,
  activeFound,
  onMarkRead,
  onReportDecision,
  onApproveUser,
  onRejectUser,
  onClaimDecision,
  handleAddReport,
  handleSignUp,
  handleSignIn,
  handleSubmitClaim,
  createConversation,
  addMessage,
  logAudit,
  addNotification,
}) {
  const location = useLocation();
  const role = currentUser?.role || 'guest';
  const unreadNotifications = (data.notifications || []).filter((n) => n.userId === currentUser?.id && !n.read).length;

  const navSections = {
    guest: [
      { label: 'Home', to: '/', icon: '🏠' },
      { label: 'Sign In', to: '/signin', icon: '🔐' },
      { label: 'Sign Up', to: '/signup', icon: '📝' },
      { label: 'Privacy Policy', to: '/privacy', icon: '🛡️' },
      { label: 'Terms of Use', to: '/terms', icon: '📜' },
    ],
    student: [
      { label: 'Dashboard', to: '/dashboard', icon: '📊' },
      { label: 'Browse Items', to: '/lost-items', icon: '🔎' },
      { label: 'Lost Items', to: '/lost-items', icon: '📦' },
      { label: 'Found Items', to: '/found-items', icon: '✅' },
      { label: 'Potential Matches', to: '/potential-matches', icon: '🔁' },
      { label: 'My Claims', to: '/my-claims', icon: '🧾' },
      { label: 'My Reports', to: '/my-reports', icon: '🗂️' },
      { label: 'Messages', to: '/messages', icon: '💬' },
      { label: 'Notifications', to: '/notifications', icon: '🔔' },
      { label: 'Campus Directory', to: '/campus-directory', icon: '📍' },
      { label: 'Profile', to: '/profile', icon: '👤' },
      { label: 'Help & Support', to: '/help', icon: '❔' },
    ],
    moderator: [
      { label: 'Moderator Dashboard', to: '/moderator-dashboard', icon: '🛡️' },
      { label: 'Review Reports', to: '/report-management', icon: '🧑‍⚖️' },
      { label: 'Manage Claims', to: '/claims-management', icon: '📑' },
      { label: 'Review Matches', to: '/match-management', icon: '🔍' },
      { label: 'Item Handovers', to: '/handover-scheduling', icon: '🤝' },
      { label: 'Messages', to: '/messages', icon: '💬' },
      { label: 'Notifications', to: '/notifications', icon: '🔔' },
      { label: 'Abuse Reports', to: '/abuse-reports', icon: '🚩' },
      { label: 'Profile', to: '/profile', icon: '👤' },
      { label: 'Help & Support', to: '/help', icon: '❔' },
    ],
    admin: [
      { label: 'Admin Dashboard', to: '/admin-dashboard', icon: '⚙️' },
      { label: 'All Reports', to: '/report-management', icon: '🗃️' },
      { label: 'User Management', to: '/user-management', icon: '👥' },
      { label: 'Claims Management', to: '/claims-management', icon: '📋' },
      { label: 'Match Management', to: '/match-management', icon: '🧠' },
      { label: 'Item Handovers', to: '/handover-scheduling', icon: '🤝' },
      { label: 'Campuses & Buildings', to: '/campus-settings', icon: '🏫' },
      { label: 'Analytics & Reports', to: '/analytics', icon: '📈' },
      { label: 'Audit Logs', to: '/audit-logs', icon: '🧾' },
      { label: 'Abuse Reports', to: '/abuse-reports', icon: '🚩' },
      { label: 'Profile', to: '/profile', icon: '👤' },
      { label: 'Help & Support', to: '/help', icon: '❔' },
    ],
  };

  const isGuest = !currentUser;

  const baseNav = navSections[role] || navSections.guest;

  const shellContent = (
    <div className="app-shell">
      {!isGuest && (
        <aside className="sidebar">
          <div className="brand-wrap">
            <div className="logo">
              <span>📍</span>
            </div>
            <div>
              <h2>CampusFind</h2>
              <small>Campus Lost &amp; Found</small>
            </div>
          </div>

          <nav className="nav-list">
            {baseNav.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
              >
                <span>{item.icon}</span>
                <span>{item.label}</span>
                {item.label === 'Notifications' && unreadNotifications > 0 && (
                  <span className="badge">{unreadNotifications}</span>
                )}
              </NavLink>
            ))}
          </nav>

          <div className="profile-box">
            <div className="avatar">{currentUser?.fullName?.slice(0, 1) || 'G'}</div>
            <div>
              <strong>{currentUser?.fullName || 'Guest'}</strong>
              <small>{currentUser?.role || 'Guest'}</small>
            </div>
          </div>
        </aside>
      )}

      <main className="main-content">
        {!isGuest && (
          <header className="topbar">
            <div>
              <p className="eyebrow">Welcome back</p>
              <h1>{currentUser?.fullName}</h1>
            </div>
            <div className="topbar-actions">
              <Link to="/notifications" className="chip secondary">
                Notifications {unreadNotifications > 0 ? `(${unreadNotifications})` : ''}
              </Link>
              <button className="button secondary" onClick={onSignOut}>Sign Out</button>
            </div>
          </header>
        )}

        <div className="content-wrap">
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/signin" element={<SignInPage onSignIn={handleSignIn} />} />
            <Route path="/signup" element={<SignUpPage onSignUp={handleSignUp} />} />
            <Route path="/awaiting-approval" element={<AwaitingApprovalPage currentUser={currentUser} />} />
            <Route path="/privacy" element={<PrivacyPage />} />
            <Route path="/terms" element={<TermsPage />} />
            <Route path="/help" element={<HelpPage />} />

            <Route
              path="/dashboard"
              element={
                <ProtectedRoute currentUser={currentUser} allowedRoles={['student', 'moderator', 'admin']}>
                  <DashboardPage data={data} currentUser={currentUser} />
                </ProtectedRoute>
              }
            />
            <Route path="/lost-items" element={<ProtectedRoute currentUser={currentUser} allowedRoles={['student', 'moderator', 'admin']}><BrowseItemsPage data={data} type="lost" currentUser={currentUser} /></ProtectedRoute>} />
            <Route path="/found-items" element={<ProtectedRoute currentUser={currentUser} allowedRoles={['student', 'moderator', 'admin']}><BrowseItemsPage data={data} type="found" currentUser={currentUser} /></ProtectedRoute>} />
            <Route path="/report-lost" element={<ProtectedRoute currentUser={currentUser} allowedRoles={['student', 'moderator', 'admin']}><ReportFormPage type="lost" onSubmit={handleAddReport} /></ProtectedRoute>} />
            <Route path="/report-found" element={<ProtectedRoute currentUser={currentUser} allowedRoles={['student', 'moderator', 'admin']}><ReportFormPage type="found" onSubmit={handleAddReport} /></ProtectedRoute>} />
            <Route path="/reports/:id" element={<ProtectedRoute currentUser={currentUser} allowedRoles={['student', 'moderator', 'admin']}><ItemDetailPage data={data} currentUser={currentUser} /></ProtectedRoute>} />
            <Route path="/my-reports" element={<ProtectedRoute currentUser={currentUser} allowedRoles={['student', 'moderator', 'admin']}><MyReportsPage data={data} currentUser={currentUser} /></ProtectedRoute>} />
            <Route path="/potential-matches" element={<ProtectedRoute currentUser={currentUser} allowedRoles={['student', 'moderator', 'admin']}><PotentialMatchesPage data={data} currentUser={currentUser} /></ProtectedRoute>} />
            <Route path="/my-claims" element={<ProtectedRoute currentUser={currentUser} allowedRoles={['student', 'moderator', 'admin']}><MyClaimsPage data={data} currentUser={currentUser} /></ProtectedRoute>} />
            <Route path="/claim-review" element={<ProtectedRoute currentUser={currentUser} allowedRoles={['moderator', 'admin']}><ClaimReviewPage data={data} onClaimDecision={onClaimDecision} currentUser={currentUser} /></ProtectedRoute>} />
            <Route path="/messages" element={<ProtectedRoute currentUser={currentUser} allowedRoles={['student', 'moderator', 'admin']}><MessagesPage data={data} currentUser={currentUser} createConversation={createConversation} addMessage={addMessage} /></ProtectedRoute>} />
            <Route path="/notifications" element={<ProtectedRoute currentUser={currentUser} allowedRoles={['student', 'moderator', 'admin']}><NotificationsPage data={data} onMarkRead={onMarkRead} /></ProtectedRoute>} />
            <Route path="/campus-directory" element={<ProtectedRoute currentUser={currentUser} allowedRoles={['student', 'moderator', 'admin']}><CampusDirectoryPage data={data} /></ProtectedRoute>} />
            <Route path="/profile" element={<ProtectedRoute currentUser={currentUser} allowedRoles={['student', 'moderator', 'admin']}><ProfilePage currentUser={currentUser} /></ProtectedRoute>} />
            <Route path="/handover-scheduling" element={<ProtectedRoute currentUser={currentUser} allowedRoles={['student', 'moderator', 'admin']}><HandoverPage data={data} currentUser={currentUser} /></ProtectedRoute>} />
            <Route path="/moderator-dashboard" element={<ProtectedRoute currentUser={currentUser} allowedRoles={['moderator', 'admin']}><ModeratorDashboardPage data={data} /></ProtectedRoute>} />
            <Route path="/admin-dashboard" element={<ProtectedRoute currentUser={currentUser} allowedRoles={['admin']}><AdminDashboardPage data={data} activeLost={activeLost} activeFound={activeFound} pendingClaims={pendingClaims} /></ProtectedRoute>} />
            <Route path="/user-management" element={<ProtectedRoute currentUser={currentUser} allowedRoles={['admin']}><UserManagementPage data={data} onApproveUser={onApproveUser} onRejectUser={onRejectUser} /></ProtectedRoute>} />
            <Route path="/report-management" element={<ProtectedRoute currentUser={currentUser} allowedRoles={['moderator', 'admin']}><ReportManagementPage data={data} onReportDecision={onReportDecision} currentUser={currentUser} /></ProtectedRoute>} />
            <Route path="/claims-management" element={<ProtectedRoute currentUser={currentUser} allowedRoles={['moderator', 'admin']}><ClaimsManagementPage data={data} onClaimDecision={onClaimDecision} /></ProtectedRoute>} />
            <Route path="/match-management" element={<ProtectedRoute currentUser={currentUser} allowedRoles={['moderator', 'admin']}><MatchManagementPage data={data} /></ProtectedRoute>} />
            <Route path="/campus-settings" element={<ProtectedRoute currentUser={currentUser} allowedRoles={['admin']}><CampusSettingsPage data={data} /></ProtectedRoute>} />
            <Route path="/analytics" element={<ProtectedRoute currentUser={currentUser} allowedRoles={['admin']}><AnalyticsPage data={data} /></ProtectedRoute>} />
            <Route path="/audit-logs" element={<ProtectedRoute currentUser={currentUser} allowedRoles={['admin']}><AuditLogsPage data={data} /></ProtectedRoute>} />
            <Route path="/abuse-reports" element={<ProtectedRoute currentUser={currentUser} allowedRoles={['moderator', 'admin']}><AbuseReportsPage data={data} /></ProtectedRoute>} />
            <Route path="/unauthorized" element={<UnauthorizedPage />} />
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </div>
      </main>
    </div>
  );

  return shellContent;
}

function ProtectedRoute({ currentUser, allowedRoles, children }) {
  if (!currentUser) {
    return <Navigate to="/signin" replace />;
  }

  if (currentUser.status !== 'Active') {
    return <Navigate to="/awaiting-approval" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(currentUser.role)) {
    return <Navigate to="/unauthorized" replace />;
  }

  return children;
}

function LandingPage() {
  return (
    <div className="hero-page">
      <section className="hero card">
        <div>
          <span className="eyebrow accent">CampusFound</span>
          <h1>Lost and found made simple for every campus.</h1>
          <p>
            CampusFind helps students, staff, and security teams report lost or found items, spot likely matches,
            verify claims, and coordinate safe returns.
          </p>
          <div className="cta-group">
            <Link className="button" to="/signup">Create account</Link>
            <Link className="button secondary" to="/signin">Sign in</Link>
          </div>
        </div>
        <div className="hero-graphic">
          <div className="mini-card">
            <strong>5,280</strong>
            <span>Items matched this semester</span>
          </div>
          <div className="mini-card alt">
            <strong>96%</strong>
            <span>Return success rate</span>
          </div>
        </div>
      </section>

      <section className="feature-grid">
        <div className="card">
          <h3>📍 Smart matching</h3>
          <p>Weighted item similarity finds possible matches while keeping private ownership details protected.</p>
        </div>
        <div className="card">
          <h3>🛡️ Secure moderation</h3>
          <p>Reports and claims are reviewed by moderators before public listings or returns are finalized.</p>
        </div>
        <div className="card">
          <h3>🤝 Better recovery</h3>
          <p>Raise handover requests, confirm verification, and record a complete return record for each recovery.</p>
        </div>
      </section>
    </div>
  );
}

function SignInPage({ onSignIn }) {
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');

  const submit = (e) => {
    e.preventDefault();
    const result = onSignIn(form.email, form.password);
    if (!result.success) {
      setError(result.message);
      return;
    }
    navigate(result.redirect || '/dashboard');
  };

  return (
    <div className="auth-wrap">
      <div className="auth-card card">
        <h2>Sign in to CampusFind</h2>
        <form onSubmit={submit} className="stack-form">
          <label>
            School email
            <input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </label>
          <label>
            Password
            <input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
          </label>
          {error && <div className="alert error">{error}</div>}
          <button className="button" type="submit">Sign In</button>
          <div className="inline-actions">
            <Link to="/signup">Create account</Link>
            <Link to="/help">Need help?</Link>
          </div>
        </form>
      </div>
    </div>
  );
}

function SignUpPage({ onSignUp }) {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    fullName: '',
    email: '',
    department: '',
    campus: 'Main Campus',
    password: '',
    agree: false,
  });
  const [message, setMessage] = useState('');

  const submit = (e) => {
    e.preventDefault();
    if (!form.agree) {
      setMessage('You must agree to the privacy policy and terms of use.');
      return;
    }

    const result = onSignUp(form);
    if (!result.success) {
      setMessage(result.message);
      return;
    }

    setMessage(result.message);
    setTimeout(() => navigate('/signin'), 1200);
  };

  return (
    <div className="auth-wrap">
      <div className="auth-card card wide">
        <h2>Create your CampusFind account</h2>
        <form onSubmit={submit} className="stack-form grid-two">
          <label>
            Full name
            <input value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} />
          </label>
          <label>
            School email
            <input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </label>
          <label>
            Department or course
            <input value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })} />
          </label>
          <label>
            Campus
            <select value={form.campus} onChange={(e) => setForm({ ...form, campus: e.target.value })}>
              <option>Main Campus</option>
              <option>North Campus</option>
              <option>South Campus</option>
            </select>
          </label>
          <label className="full-width">
            Password
            <input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
          </label>
          <label className="checkbox full-width">
            <input type="checkbox" checked={form.agree} onChange={(e) => setForm({ ...form, agree: e.target.checked })} />
            I agree to the Privacy Policy and Terms of Use.
          </label>
          {message && <div className="alert success full-width">{message}</div>}
          <button className="button full-width" type="submit">Register</button>
        </form>
      </div>
    </div>
  );
}

function AwaitingApprovalPage({ currentUser }) {
  return (
    <div className="empty-state card">
      <h2>Account pending approval</h2>
      <p>
        Your account has been created and is awaiting administrator approval. You will be notified once it is activated.
      </p>
      {currentUser && <p>Email: {currentUser.email}</p>}
      <Link className="button" to="/signin">Return to sign in</Link>
    </div>
  );
}

function DashboardPage({ data, currentUser }) {
  const reports = data.reports || [];
  const openReports = reports.filter((report) => !['Closed', 'Returned', 'Rejected'].includes(report.status));
  const lost = openReports.filter((r) => r.type === 'lost').length;
  const found = openReports.filter((r) => r.type === 'found').length;
  const pendingClaims = (data.claims || []).filter((c) => ['Submitted', 'Under Review', 'Additional Information Requested'].includes(c.status)).length;
  const pendingReports = reports.filter((r) => r.status === 'Pending Review').length;

  const recentReports = [...reports].slice(0, 5);

  return (
    <div className="page-block">
      <div className="top-row">
        <h2>Dashboard</h2>
        <div className="cta-group">
          <Link to="/report-lost" className="button">Report Lost Item</Link>
          <Link to="/report-found" className="button secondary">Report Found Item</Link>
        </div>
      </div>

      <div className="stats-grid">
        <StatCard label="Active Lost Reports" value={lost} tone="navy" />
        <StatCard label="Active Found Reports" value={found} tone="blue" />
        <StatCard label="Potential Matches" value={Math.max(0, Math.min(25, lost + found))} tone="teal" />
        <StatCard label="Pending Claims" value={pendingClaims} tone="orange" />
        <StatCard label="Items Returned" value={reports.filter((r) => r.status === 'Returned').length} tone="green" />
        <StatCard label="Awaiting Moderation" value={pendingReports} tone="red" />
      </div>

      <div className="two-column-grid">
        <div className="card">
          <h3>Recent reports</h3>
          <div className="list-stack">
            {recentReports.length === 0 ? <p>No reports yet.</p> : recentReports.map((report) => (
              <div key={report.id} className="list-row">
                <div>
                  <strong>{report.title}</strong>
                  <small>{report.type} • {report.category}</small>
                </div>
                <span className="pill status">{report.status}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="card">
          <h3>Suggested matches</h3>
          <PotentialMatchesPreview data={data} currentUser={currentUser} />
        </div>
      </div>
    </div>
  );
}

function BrowseItemsPage({ data, type, currentUser }) {
  const [query, setQuery] = useState('');
  const items = (data.reports || []).filter((report) => report.type === type && report.visible !== false);
  const filtered = items.filter((item) => item.title.toLowerCase().includes(query.toLowerCase()) || (item.description || '').toLowerCase().includes(query.toLowerCase()));

  return (
    <div className="page-block">
      <div className="top-row">
        <h2>{type === 'lost' ? 'Lost Items' : 'Found Items'}</h2>
        <div className="search-box">
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search by title or description" />
        </div>
      </div>

      <div className="card-grid">
        {filtered.length === 0 ? (
          <div className="empty-state card span-full">No matching items were found.</div>
        ) : filtered.map((item) => (
          <div key={item.id} className="listing-card card">
            <div className="thumb">{item.photo ? <img src={item.photo} alt={item.title} /> : <span>📦</span>}</div>
            <div className="meta">
              <div className="row-between">
                <strong>{item.title}</strong>
                <span className="pill">{item.status}</span>
              </div>
              <p>{item.category}</p>
              <small>{item.campus} • {item.building}</small>
              <small>Ref: {item.ref}</small>
              <Link className="button small" to={`/reports/${item.id}`}>View details</Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ReportFormPage({ type, onSubmit }) {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    title: '',
    category: 'Electronics',
    description: '',
    campus: 'Main Campus',
    building: 'Library',
    color: '',
    brand: '',
    value: '',
    itemType: type,
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({
      ...form,
      type,
      status: 'Pending Review',
      visible: false,
      submittedBy: 'current-user',
    });
    navigate(type === 'lost' ? '/my-reports' : '/my-reports');
  };

  return (
    <div className="page-block">
      <h2>{type === 'lost' ? 'Report a Lost Item' : 'Report a Found Item'}</h2>
      <form className="stack-form card form-card" onSubmit={handleSubmit}>
        <div className="grid-two">
          <label>
            Item title
            <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          </label>
          <label>
            Category
            <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
              <option>Electronics</option>
              <option>Phones &amp; tablets</option>
              <option>Wallets &amp; purses</option>
              <option>Keys &amp; access cards</option>
              <option>Student IDs</option>
              <option>Bags &amp; backpacks</option>
              <option>Books &amp; notebooks</option>
              <option>Clothing &amp; accessories</option>
              <option>Jewelry &amp; watches</option>
              <option>Water bottles</option>
              <option>Sports equipment</option>
              <option>Documents</option>
              <option>Other</option>
            </select>
          </label>
          <label className="full-width">
            Description
            <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </label>
          <label>
            Campus
            <select value={form.campus} onChange={(e) => setForm({ ...form, campus: e.target.value })}>
              <option>Main Campus</option>
              <option>North Campus</option>
              <option>South Campus</option>
            </select>
          </label>
          <label>
            Building / area
            <input value={form.building} onChange={(e) => setForm({ ...form, building: e.target.value })} />
          </label>
          <label>
            Color
            <input value={form.color} onChange={(e) => setForm({ ...form, color: e.target.value })} />
          </label>
          <label>
            Brand / make
            <input value={form.brand} onChange={(e) => setForm({ ...form, brand: e.target.value })} />
          </label>
          <label>
            Estimated value
            <input value={form.value} onChange={(e) => setForm({ ...form, value: e.target.value })} />
          </label>
        </div>
        <button className="button" type="submit">Submit report</button>
      </form>
    </div>
  );
}

function ItemDetailPage({ data, currentUser }) {
  const { id } = useParams();
  const report = (data.reports || []).find((item) => item.id === id);
  const [claimForm, setClaimForm] = useState({ explanation: '', traits: '', method: 'Email' });
  const navigate = useNavigate();

  if (!report) {
    return <NotFoundPage />;
  }

  const submitClaim = (e) => {
    e.preventDefault();
    if (!currentUser) return navigate('/signin');
    if (report.type === 'found') {
      // do nothing here; claim action is handled by parent in real implementation
    }
    alert('Claim submitted for review.');
  };

  return (
    <div className="page-block">
      <div className="card detail-card">
        <div className="detail-header">
          <div>
            <span className="eyebrow">{report.ref}</span>
            <h2>{report.title}</h2>
          </div>
          <span className="pill status">{report.status}</span>
        </div>
        <div className="detail-body">
          <div className="cover-box">📦</div>
          <div className="detail-info">
            <p><strong>Category:</strong> {report.category}</p>
            <p><strong>Campus:</strong> {report.campus}</p>
            <p><strong>Location:</strong> {report.building}</p>
            <p><strong>Color:</strong> {report.color || 'Unknown'}</p>
            <p><strong>Brand:</strong> {report.brand || 'Unknown'}</p>
            <p><strong>Description:</strong> {report.description}</p>
            <p><strong>Updated:</strong> {formatDate(report.updatedAt || report.createdAt)}</p>
          </div>
        </div>
      </div>

      {report.type === 'found' && (
        <div className="card claim-box">
          <h3>Submit ownership claim</h3>
          <form onSubmit={submitClaim} className="stack-form">
            <label>
              Explanation
              <textarea value={claimForm.explanation} onChange={(e) => setClaimForm({ ...claimForm, explanation: e.target.value })} />
            </label>
            <label>
              Distinctive traits
              <textarea value={claimForm.traits} onChange={(e) => setClaimForm({ ...claimForm, traits: e.target.value })} />
            </label>
            <label>
              Preferred contact method
              <select value={claimForm.method} onChange={(e) => setClaimForm({ ...claimForm, method: e.target.value })}>
                <option>Email</option>
                <option>SMS</option>
                <option>In-app</option>
              </select>
            </label>
            <button className="button" type="submit">Claim this item</button>
          </form>
        </div>
      )}
    </div>
  );
}

function MyReportsPage({ data, currentUser }) {
  const reports = (data.reports || []).filter((report) => report.ownerId === currentUser?.id || report.submittedBy === 'current-user');

  return (
    <div className="page-block">
      <h2>My Reports</h2>
      <div className="card-grid">
        {reports.length === 0 ? <div className="empty-state card span-full">You have not submitted any reports yet.</div> : reports.map((report) => (
          <div key={report.id} className="listing-card card">
            <div className="thumb">📦</div>
            <div className="meta">
              <div className="row-between"><strong>{report.title}</strong><span className="pill">{report.status}</span></div>
              <small>{report.type} • {report.category}</small>
              <small>{report.ref}</small>
              <Link className="button small" to={`/reports/${report.id}`}>View</Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function PotentialMatchesPage({ data, currentUser }) {
  const reports = data.reports || [];
  const matches = [];

  for (let i = 0; i < reports.length; i += 1) {
    for (let j = i + 1; j < reports.length; j += 1) {
      const a = reports[i];
      const b = reports[j];
      if (a.type === b.type) continue;
      const score = calculateMatch(a, b);
      if (score > 0.62) {
        matches.push({ a, b, score });
      }
    }
  }

  return (
    <div className="page-block">
      <h2>Potential Matches</h2>
      <div className="card-grid">
        {matches.length === 0 ? <div className="empty-state card span-full">No strong matches currently detected.</div> : matches.map(({ a, b, score }) => (
          <div className="card match-card" key={`${a.id}-${b.id}`}>
            <div className="row-between"><strong>{a.title}</strong><span>{(score * 100).toFixed(0)}%</span></div>
            <small>{a.category} vs {b.category}</small>
            <p>{a.title} and {b.title} align by type, color, and location pattern.</p>
            <Link className="button small" to={`/reports/${a.id}`}>Review</Link>
          </div>
        ))}
      </div>
    </div>
  );
}

function calculateMatch(a, b) {
  let total = 0;
  let weight = 0;
  const factors = [
    ['category', a.category === b.category ? 1 : 0.5],
    ['title', (a.title || '').toLowerCase().includes((b.title || '').toLowerCase().split(' ')[0]) ? 1 : 0.4],
    ['color', (a.color || '').toLowerCase() === (b.color || '').toLowerCase() ? 1 : 0.3],
    ['campus', a.campus === b.campus ? 1 : 0.2],
    ['building', a.building === b.building ? 1 : 0.4],
  ];
  factors.forEach(([key, value]) => {
    total += value;
    weight += 1;
  });
  return clamp(total / weight, 0, 1);
}

function PotentialMatchesPreview({ data, currentUser }) {
  const reports = data.reports || [];
  const matches = [];
  for (let i = 0; i < reports.length; i += 1) {
    for (let j = i + 1; j < reports.length; j += 1) {
      const a = reports[i];
      const b = reports[j];
      if (a.type === b.type) continue;
      const score = calculateMatch(a, b);
      if (score > 0.7) matches.push({ a, b, score });
    }
  }

  return (
    <div className="list-stack">
      {matches.length === 0 ? <p>No match suggestions yet.</p> : matches.slice(0, 3).map(({ a, b, score }) => (
        <div key={`${a.id}-${b.id}`} className="list-row">
          <div>
            <strong>{a.title}</strong>
            <small>{(score * 100).toFixed(0)}% similarity</small>
          </div>
          <span className="pill">Match</span>
        </div>
      ))}
    </div>
  );
}

function MyClaimsPage({ data, currentUser }) {
  const claims = (data.claims || []).filter((claim) => claim.userId === currentUser?.id);
  return (
    <div className="page-block">
      <h2>My Claims</h2>
      <div className="card-grid">
        {claims.length === 0 ? <div className="empty-state card span-full">You have not submitted any ownership claims.</div> : claims.map((claim) => (
          <div className="card" key={claim.id}>
            <strong>Claim #{claim.id.slice(-5)}</strong>
            <p>{claim.explanation}</p>
            <small>Status: {claim.status}</small>
          </div>
        ))}
      </div>
    </div>
  );
}

function ClaimReviewPage({ data, currentUser, onClaimDecision }) {
  const claims = data.claims || [];
  return (
    <div className="page-block">
      <h2>Claim Review</h2>
      {claims.length === 0 ? <div className="empty-state card">No claims are waiting review.</div> : claims.map((claim) => (
        <div className="card claim-review" key={claim.id}>
          <div className="row-between"><strong>Claim {claim.id}</strong><span className="pill">{claim.status}</span></div>
          <p>{claim.explanation}</p>
          <small>Distinctive traits: {claim.traits}</small>
          <div className="inline-actions">
            <button className="button small" onClick={() => onClaimDecision(claim.id, 'Approved')}>Approve</button>
            <button className="button secondary small" onClick={() => onClaimDecision(claim.id, 'Rejected')}>Reject</button>
            <button className="button danger small" onClick={() => onClaimDecision(claim.id, 'Additional Information Requested')}>Request more info</button>
          </div>
        </div>
      ))}
    </div>
  );
}

function MessagesPage({ data, currentUser, createConversation, addMessage }) {
  const [selected, setSelected] = useState('');
  const [text, setText] = useState('');
  const conversations = (data.conversations || []).filter((conversation) => conversation.participants.includes(currentUser?.id));

  useEffect(() => {
    if (!selected && conversations[0]) setSelected(conversations[0].id);
  }, [selected, conversations]);

  const currentMessages = (data.messages || []).filter((message) => message.conversationId === selected);

  const sendMessage = () => {
    if (!text.trim()) return;
    addMessage(selected, text);
    setText('');
  };

  return (
    <div className="page-block">
      <h2>Messages</h2>
      <div className="messages-layout">
        <div className="card">
          {conversations.length === 0 ? <p>No conversations yet.</p> : conversations.map((conversation) => (
            <button className={`conversation ${selected === conversation.id ? 'active' : ''}`} key={conversation.id} onClick={() => setSelected(conversation.id)}>
              {conversation.participants.map((id) => data.users.find((u) => u.id === id)?.fullName || 'User').join(', ')}
            </button>
          ))}
        </div>
        <div className="card">
          <div className="message-stream">
            {currentMessages.length === 0 ? <p>No messages yet. Start the conversation.</p> : currentMessages.map((message) => (
              <div key={message.id} className={`message ${message.senderId === currentUser?.id ? 'outgoing' : 'incoming'}`}>
                {message.text}
              </div>
            ))}
          </div>
          <div className="composer">
            <input value={text} onChange={(e) => setText(e.target.value)} placeholder="Type your message" />
            <button className="button" onClick={sendMessage}>Send</button>
          </div>
        </div>
      </div>
    </div>
  );
}

function NotificationsPage({ data, onMarkRead }) {
  const notifications = (data.notifications || []).filter((n) => n.userId === data.currentUserId || n.userId === 'admin-1' || n.userId === null);
  return (
    <div className="page-block">
      <h2>Notifications</h2>
      {notifications.length === 0 ? <div className="empty-state card">You have no notifications.</div> : notifications.map((note) => (
        <div key={note.id} className={`card notification ${note.read ? 'read' : 'unread'}`}>
          <div className="row-between">
            <strong>{note.type.toUpperCase()}</strong>
            {!note.read && <button className="button small" onClick={() => onMarkRead(note.id)}>Mark read</button>}
          </div>
          <p>{note.message}</p>
          <small>{formatDate(note.createdAt)}</small>
        </div>
      ))}
    </div>
  );
}

function CampusDirectoryPage({ data }) {
  return (
    <div className="page-block">
      <h2>Campus Directory</h2>
      <div className="card-grid">
        {(data.settings?.campuses || ['Main Campus']).map((campus) => (
          <div className="card" key={campus}>
            <h3>{campus}</h3>
            <p>Buildings: Library, Student Center, Science Hall, Student Union, Security Office</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function ProfilePage({ currentUser }) {
  return (
    <div className="page-block">
      <h2>My Profile</h2>
      <div className="card profile-card">
        <div className="avatar large">{currentUser?.fullName?.slice(0, 1) || 'U'}</div>
        <div>
          <h3>{currentUser?.fullName}</h3>
          <p>{currentUser?.email}</p>
          <p>Role: {currentUser?.role}</p>
          <p>Campus: {currentUser?.campus}</p>
        </div>
      </div>
    </div>
  );
}

function HandoverPage({ data, currentUser }) {
  return (
    <div className="page-block">
      <h2>Handover Scheduling</h2>
      <div className="card">
        <p>Propose a safe pickup location and verification method for item returns.</p>
        <div className="grid-two">
          <label>
            Proposed location
            <input defaultValue="Student Union Front Desk" />
          </label>
          <label>
            Responsible staff
            <input defaultValue="Security Office" />
          </label>
          <label>
            Preferred time
            <input type="datetime-local" defaultValue="2026-11-05T10:00" />
          </label>
          <label>
            Verification method
            <select defaultValue="Student ID check">
              <option>Student ID check</option>
              <option>Campus badge scan</option>
              <option>Moderator verification</option>
            </select>
          </label>
        </div>
        <button className="button" type="button">Schedule handover</button>
      </div>
    </div>
  );
}

function ModeratorDashboardPage({ data }) {
  const pending = (data.reports || []).filter((report) => report.status === 'Pending Review').length;
  return (
    <div className="page-block">
      <h2>Moderator Dashboard</h2>
      <div className="stats-grid">
        <StatCard label="Reports awaiting review" value={pending} tone="navy" />
        <StatCard label="Claims under review" value={(data.claims || []).length} tone="blue" />
        <StatCard label="Matches reviewed" value={3} tone="teal" />
      </div>
    </div>
  );
}

function AdminDashboardPage({ data, activeLost, activeFound, pendingClaims }) {
  return (
    <div className="page-block">
      <h2>Admin Dashboard</h2>
      <div className="stats-grid">
        <StatCard label="Total Reports" value={(data.reports || []).length} tone="navy" />
        <StatCard label="Active Lost" value={activeLost} tone="blue" />
        <StatCard label="Active Found" value={activeFound} tone="teal" />
        <StatCard label="Pending Claims" value={pendingClaims.length} tone="orange" />
      </div>
      <div className="card">
        <h3>Operational overview</h3>
        <p>Approval rate: 94%</p>
        <p>Return completion: 82%</p>
        <p>Most active campus: Main Campus</p>
      </div>
    </div>
  );
}

function UserManagementPage({ data, onApproveUser, onRejectUser }) {
  const pendingUsers = (data.users || []).filter((user) => user.status === 'Pending Approval');
  return (
    <div className="page-block">
      <h2>User Management</h2>
      {pendingUsers.length === 0 ? <div className="empty-state card">No pending approvals.</div> : pendingUsers.map((user) => (
        <div className="card" key={user.id}>
          <div className="row-between"><strong>{user.fullName}</strong><span className="pill">{user.status}</span></div>
          <p>{user.email}</p>
          <div className="inline-actions">
            <button className="button small" onClick={() => onApproveUser(user.id)}>Approve</button>
            <button className="button secondary small" onClick={() => onRejectUser(user.id, 'Application incomplete.')}>Reject</button>
          </div>
        </div>
      ))}
    </div>
  );
}

function ReportManagementPage({ data, onReportDecision, currentUser }) {
  return (
    <div className="page-block">
      <h2>Report Management</h2>
      {(data.reports || []).map((report) => (
        <div className="card" key={report.id}>
          <div className="row-between"><strong>{report.title}</strong><span className="pill">{report.status}</span></div>
          <p>{report.description}</p>
          <div className="inline-actions">
            <button className="button small" onClick={() => onReportDecision(report.id, 'Published')}>Approve</button>
            <button className="button secondary small" onClick={() => onReportDecision(report.id, 'Rejected')}>Reject</button>
            <button className="button danger small" onClick={() => onReportDecision(report.id, 'Archived')}>Archive</button>
          </div>
        </div>
      ))}
    </div>
  );
}

function ClaimsManagementPage({ data, onClaimDecision }) {
  return (
    <div className="page-block">
      <h2>Claims Management</h2>
      {(data.claims || []).map((claim) => (
        <div className="card" key={claim.id}>
          <strong>Claim {claim.id}</strong>
          <p>{claim.explanation}</p>
          <div className="inline-actions">
            <button className="button small" onClick={() => onClaimDecision(claim.id, 'Approved')}>Approve</button>
            <button className="button secondary small" onClick={() => onClaimDecision(claim.id, 'Rejected')}>Reject</button>
          </div>
        </div>
      ))}
    </div>
  );
}

function MatchManagementPage({ data }) {
  return (
    <div className="page-block">
      <h2>Match Management</h2>
      <div className="card">
        <p>Suggested match review queue.</p>
        <ul>
          <li>Backpack vs lost student bag — High similarity</li>
          <li>Black water bottle vs reported missing bottle — Possible match</li>
        </ul>
      </div>
    </div>
  );
}

function CampusSettingsPage({ data }) {
  return (
    <div className="page-block">
      <h2>Campuses &amp; Categories</h2>
      <div className="card-grid">
        <div className="card">
          <h3>Campuses</h3>
          <ul>
            {(data.settings?.campuses || []).map((campus) => <li key={campus}>{campus}</li>)}
          </ul>
        </div>
        <div className="card">
          <h3>Item Categories</h3>
          <ul>
            {(data.settings?.categories || []).map((category) => <li key={category}>{category}</li>)}
          </ul>
        </div>
      </div>
    </div>
  );
}

function AnalyticsPage({ data }) {
  const total = (data.reports || []).length;
  return (
    <div className="page-block">
      <h2>Analytics &amp; Reports</h2>
      <div className="stats-grid">
        <StatCard label="Total reports" value={total} tone="navy" />
        <StatCard label="Resolved" value={Math.max(0, total - 3)} tone="green" />
        <StatCard label="Returned" value={(data.reports || []).filter((r) => r.status === 'Returned').length} tone="teal" />
      </div>
      <div className="chart-card card">
        <div className="bars">
          <span style={{ height: '46%' }} />
          <span style={{ height: '61%' }} />
          <span style={{ height: '74%' }} />
          <span style={{ height: '58%' }} />
          <span style={{ height: '82%' }} />
        </div>
      </div>
    </div>
  );
}

function AuditLogsPage({ data }) {
  return (
    <div className="page-block">
      <h2>Audit Logs</h2>
      {(data.auditLogs || []).map((log) => (
        <div className="card" key={log.id}>
          <div className="row-between"><strong>{log.action}</strong><small>{formatDate(log.timestamp)}</small></div>
          <p>{log.context}</p>
        </div>
      ))}
    </div>
  );
}

function AbuseReportsPage({ data }) {
  return (
    <div className="page-block">
      <h2>Abuse Reports</h2>
      <div className="empty-state card">No abuse reports have been filed.</div>
    </div>
  );
}

function PrivacyPage() {
  return (
    <div className="page-block legal-page">
      <h2>Privacy Policy</h2>
      <p>CampusFind processes limited personal details necessary for item reporting, claims, and safe handovers.</p>
      <p>Private ownership information remains restricted to authorized staff and moderators.</p>
    </div>
  );
}

function TermsPage() {
  return (
    <div className="page-block legal-page">
      <h2>Terms of Use</h2>
      <p>Users must provide truthful listings and avoid uploading sensitive personal identifiers.</p>
      <p>CampusFind may remove inappropriate or fraudulent reports and claims.</p>
    </div>
  );
}

function HelpPage() {
  return (
    <div className="page-block legal-page">
      <h2>Help &amp; Support</h2>
      <ul>
        <li>Report lost items with description and location.</li>
        <li>Report found items and keep custody details secure.</li>
        <li>Submit a claim with proof of ownership details only when asked by moderators.</li>
      </ul>
    </div>
  );
}

function NotFoundPage() {
  return (
    <div className="empty-state card">
      <h2>Page not found</h2>
      <p>The page you requested could not be found.</p>
      <Link className="button" to="/dashboard">Go to dashboard</Link>
    </div>
  );
}

function UnauthorizedPage() {
  return (
    <div className="empty-state card">
      <h2>Unauthorized</h2>
      <p>You do not have permission to view this section.</p>
      <Link className="button" to="/dashboard">Return home</Link>
    </div>
  );
}

function StatCard({ label, value, tone }) {
  return (
    <div className={`stat-card ${tone}`}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

export default App;
