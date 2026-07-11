import api from './axiosConfig';

function issueError(error, fallback) {
  return error.response?.data || { message: fallback };
}

export async function createIssue(payload) {
  try {
    const { data } = await api.post('/issues', payload);
    return data;
  } catch (error) {
    throw issueError(error, 'Could not submit your issue');
  }
}

export async function getMyIssues(params = {}) {
  try {
    const { data } = await api.get('/issues', { params });
    return data.data;
  } catch (error) {
    throw issueError(error, 'Could not load your issues');
  }
}
