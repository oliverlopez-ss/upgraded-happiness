import client from './client';

// Auth
export const auth = {
  login: (credentials) => client.post('/Auth', credentials),
  getCompanyInfo: () => client.get('/Auth'),
  refreshToken: () => client.post('/Auth/refresh'),
  loginJwt: (data) => client.post('/Auth/jwt', data),
};

// Invoices
export const invoices = {
  list: (params) => client.get('/Invoice', { params }),
  getById: (id) => client.get(`/Invoice/${id}`),
  create: (data) => client.post('/Invoice', data),
  update: (id, data) => client.put(`/Invoice/${id}`, data),
  delete: (id) => client.delete(`/Invoice/${id}`),
  send: (id, data) => client.post(`/Invoice/Send/${id}`, data),
  getTodos: (params) => client.get('/Invoice/Todos', { params }),
  getStateLogs: (id) => client.get(`/Invoice/StateLogs/${id}`),
  getPdf: (id, version) => client.get(`/Invoice/${id}/pdf/${version}`, { responseType: 'blob' }),
  getAttachments: (id) => client.get(`/Invoice/${id}/attachments`),
  getCommonSellers: () => client.get('/Invoice/CommonSellers'),
};

// Customers
export const customers = {
  list: (params) => client.get('/Customer', { params }),
  getById: (id) => client.get(`/Customer/${id}`),
  create: (data) => client.post('/Customer', data),
  update: (id, data) => client.put(`/Customer/${id}`, data),
  delete: (id) => client.delete(`/Customer/Delete/${id}`),
  searchByName: (params) => client.get('/Customer/SearchByName', { params }),
  searchByOrgNr: (params) => client.get('/Customer/SearchByOrgNr', { params }),
  getCommon: () => client.get('/Customer/Common'),
  getRating: (params) => client.get('/Customer/Rating', { params }),
  activate: (id) => client.post(`/Customer/Activate/${id}`),
  deactivate: (id) => client.post(`/Customer/Deactivate/${id}`),
};

// Receipts
export const receipts = {
  list: (params) => client.get('/Receipt', { params }),
  getById: (id) => client.get(`/Receipt/${id}`),
  create: (data) => client.post('/Receipt', data),
  update: (id, data) => client.put(`/Receipt/${id}`, data),
  cancel: (id) => client.post(`/Receipt/Cancel/${id}`),
  sign: (id) => client.post(`/Receipt/Sign/${id}`),
  getStateLogs: (id) => client.get(`/Receipt/StateLogs/${id}`),
  getTransactions: (id) => client.get(`/Receipt/Transactions/${id}`),
};

// Employees
export const employees = {
  list: (params) => client.get('/Employees', { params }),
  getById: (id) => client.get(`/Employees/${id}`),
  create: (data) => client.post('/Employees', data),
  update: (id, data) => client.put(`/Employees/${id}`, data),
  delete: (id) => client.delete(`/Employees/${id}`),
};

// Accounts
export const accounts = {
  list: (params) => client.get('/Account', { params }),
  getBalance: (account) => client.get(`/Account/AccountBalance/${account}`),
  getAccountingDoneUntil: () => client.get('/Account/AccountingDoneUntil'),
};

// Articles
export const articles = {
  list: (params) => client.get('/Article', { params }),
  getById: (id) => client.get(`/Article/${id}`),
  create: (data) => client.post('/Article', data),
  update: (id, data) => client.put(`/Article/${id}`, data),
  delete: (id) => client.delete(`/Article/${id}`),
  activate: (id) => client.post(`/Article/Activate/${id}`),
  deactivate: (id) => client.post(`/Article/Deactivate/${id}`),
};

// Vouchers
export const vouchers = {
  list: (params) => client.get('/Voucher', { params }),
  getById: (id) => client.get(`/Voucher/${id}`),
  create: (data) => client.post('/Voucher', data),
  delete: (id) => client.delete(`/Voucher/${id}`),
};

// Financial Reports
export const financialReports = {
  resultReport: (data) => client.post('/FinancialReports/ResultReport', data),
  balanceReport: (data) => client.post('/FinancialReports/BalanceReport', data),
  monthlyResultReport: (data) => client.post('/FinancialReports/MonthlyResultReport', data),
  monthlyBalanceReport: (data) => client.post('/FinancialReports/MonthlyBalanceReport', data),
};

// Salary
export const salaryDrafts = {
  list: (params) => client.get('/SalaryDrafts', { params }),
  getById: (id) => client.get(`/SalaryDrafts/${id}`),
  update: (id, data) => client.put(`/SalaryDrafts/${id}`, data),
  accept: (id) => client.post(`/SalaryDrafts/${id}/Accept`),
  reject: (id, data) => client.post(`/SalaryDrafts/${id}/Reject`, data),
};

export const salaryDeviations = {
  list: (params) => client.get('/SalaryDeviation', { params }),
  getById: (id) => client.get(`/SalaryDeviation/${id}`),
  create: (data) => client.post('/SalaryDeviation/Create', data),
  update: (data) => client.put('/SalaryDeviation', data),
  delete: (id) => client.delete(`/SalaryDeviation/${id}`),
  getMonths: () => client.get('/SalaryDeviation/months'),
};

// Dimensions
export const dimensions = {
  list: (params) => client.get('/Dimension', { params }),
  create: (data) => client.post('/Dimension', data),
  update: (id, data) => client.put(`/Dimension/${id}`, data),
  delete: (id) => client.delete(`/Dimension/${id}`),
  getTypes: () => client.get('/DimensionTypes'),
};

// Support
export const support = {
  list: (params) => client.get('/Support', { params }),
  getById: (id) => client.get(`/Support/${id}`),
  create: (data) => client.post('/Support', data),
  resolve: (id) => client.post(`/Support/${id}/Resolve`),
  unresolve: (id) => client.post(`/Support/${id}/Unresolve`),
  getComments: (id, params) => client.get(`/Support/${id}/Comments`, { params }),
  addComment: (id, data) => client.post(`/Support/${id}/Comments`, data),
};

// Transactions
export const transactions = {
  list: (params) => client.get('/Transaction', { params }),
  getSeries: () => client.get('/Transaction/Series'),
  getCategories: () => client.get('/Transaction/Categories'),
};

// Cash Reconciliation
export const cashReconciliation = {
  list: (params) => client.get('/CashReconciliation', { params }),
  getById: (id) => client.get(`/CashReconciliation/${id}`),
  create: (data) => client.post('/CashReconciliation', data),
  update: (id, data) => client.put(`/CashReconciliation/${id}`, data),
  delete: (id) => client.delete(`/CashReconciliation/${id}`),
};

// Time Reports
export const timeReports = {
  list: (params) => client.get('/TimeReport/Report', { params }),
  exportReport: (params) => client.get('/TimeReport/Export', { params }),
  getStatus: (params) => client.get('/TimeReport/Status', { params }),
};

// Survey
export const surveys = {
  getById: (id) => client.get(`/Survey/${id}`),
  getStatus: (id) => client.get(`/Survey/${id}/Status`),
  addComment: (id, data) => client.post(`/Survey/${id}/comments`, data),
};

// Currency
export const currency = {
  getExchangeRate: (curr) => client.get(`/Currency/${curr}`),
};

// Search
export const search = {
  query: (params) => client.get('/Search', { params }),
};
