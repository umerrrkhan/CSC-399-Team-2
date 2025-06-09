// import axios from 'axios';

// export async function getByRefresh(refreshToken) {
//   const tokenEndpoint = 'https://api.kroger.com/v1/connect/oauth2/token';

//   const clientId = process.env.KROGER_CLIENT_ID;
//   const clientSecret = process.env.KROGER_CLIENT_SECRET;
//   const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

//   const response = await axios.post(tokenEndpoint,
//     new URLSearchParams({
//       grant_type: 'refresh_token',
//       refresh_token: refreshToken,
//     }),
//     {
//       headers: {
//         'Content-Type': 'application/x-www-form-urlencoded',
//         Authorization: `Basic ${credentials}`,
//       },
//     }
//   );

//   return response.data;
// }

