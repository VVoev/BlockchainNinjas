const qs = require('querystring');
const axios = require('axios');

const getUsers = async (senderId, url) => {
  return await axios.get(url).then(res => {
    return res
              .data
              .members
              .filter(user => user.profile.email && user.id != senderId)
              .map(user => {
                return {
                  label: user.real_name,
                  value: user.name
                }
              });
    });
};

module.exports = { getUsers };
