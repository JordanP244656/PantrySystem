import axios from 'axios'

const api = axios.create({ baseURL: '/api' })

export const getItems = (q) => api.get('/items', { params: q ? { q } : {} }).then(r => r.data)
export const createItem = (data) => api.post('/items', data).then(r => r.data)
export const updateItem = (id, data) => api.put(`/items/${id}`, data).then(r => r.data)
export const deleteItem = (id) => api.delete(`/items/${id}`).then(r => r.data)
export const addItemSize = (id, data) => api.post(`/items/${id}/sizes`, data).then(r => r.data)
export const updateItemSize = (id, sizeId, data) => api.put(`/items/${id}/sizes/${sizeId}`, data).then(r => r.data)
export const deleteItemSize = (id, sizeId) => api.delete(`/items/${id}/sizes/${sizeId}`).then(r => r.data)

export const getStores = () => api.get('/stores').then(r => r.data)
export const createStore = (data) => api.post('/stores', data).then(r => r.data)
export const updateStore = (id, data) => api.put(`/stores/${id}`, data).then(r => r.data)
export const deleteStore = (id) => api.delete(`/stores/${id}`).then(r => r.data)
export const getStoreItems = (storeId) => api.get(`/stores/${storeId}/items`).then(r => r.data)
export const addStoreItemLink = (storeId, data) => api.post(`/stores/${storeId}/items`, data).then(r => r.data)
export const updateStoreItemLink = (storeId, linkId, data) => api.put(`/stores/${storeId}/items/${linkId}`, data).then(r => r.data)
export const deleteStoreItemLink = (storeId, linkId) => api.delete(`/stores/${storeId}/items/${linkId}`).then(r => r.data)

export const scanOut = (data) => api.post('/transactions/scan-out', data).then(r => r.data)
export const throwOut = (data) => api.post('/transactions/throw-out', data).then(r => r.data)
export const scanIn = (data) => api.post('/transactions/scan-in', data).then(r => r.data)
export const massStock = (data) => api.post('/transactions/mass-stock', data).then(r => r.data)
export const getTransactions = (params) => api.get('/transactions', { params }).then(r => r.data)
export const getCurrentStock = () => api.get('/transactions/current-stock').then(r => r.data)
export const getLowStock = () => api.get('/transactions/low-stock').then(r => r.data)

export const lookupUPC = (barcode) => api.get(`/upc/${barcode}`).then(r => r.data)

export const getUsageReport = (params) => api.get('/reports/usage', { params }).then(r => r.data)
export const getThrowOutReport = (params) => api.get('/reports/throw-out', { params }).then(r => r.data)
export const getExpiringReport = (params) => api.get('/reports/expiring', { params }).then(r => r.data)
export const getTopUsed = (params) => api.get('/reports/top-used', { params }).then(r => r.data)
