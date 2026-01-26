<<<<<<< HEAD
require('dotenv').config()
const axios = require('axios')

async function testOpenRouter() {
  console.log('==========================================')
  console.log('Testing OpenRouter API Connection')
  console.log('==========================================\n')
  
  const apiKey = process.env.OPENROUTER_API_KEY
  
  if (!apiKey) {
    console.error('❌ OPENROUTER_API_KEY not found in .env file!')
    return
  }
  
  console.log('✓ API Key found:', apiKey.substring(0, 20) + '...')
  console.log('✓ Key length:', apiKey.length, 'characters\n')
  
  console.log('Making test request...\n')
  
  try {
    const response = await axios.post(
      'https://openrouter.ai/api/v1/chat/completions',
      {
        model: 'deepseek/deepseek-r1-0528',
        messages: [
          { 
            role: 'user', 
            content: 'List 3 famous restaurants in Paris. For each, provide: NAME, DESCRIPTION, RATING (3.5-5.0), PRICE (1-4). Separate with ---'
          }
        ],
        temperature: 0.7,
        max_tokens: 1000
      },
      {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'http://localhost:5000',
          'X-Title': 'Planora Test'
        },
        timeout: 30000
      }
    )
    
    console.log('✅ SUCCESS! API is working!\n')
    console.log('Response status:', response.status)
    console.log('Model used:', response.data.model)
    console.log('\n--- AI Response ---')
    console.log(response.data.choices[0].message.content)
    console.log('-------------------\n')
    
    console.log('✓ OpenRouter API is configured correctly!')
    console.log('✓ Your backend should work now')
    
  } catch (error) {
    console.error('❌ API REQUEST FAILED!\n')
    
    if (error.response) {
      console.error('Status Code:', error.response.status)
      console.error('Status Text:', error.response.statusText)
      console.error('Error Data:', JSON.stringify(error.response.data, null, 2))
      
      if (error.response.status === 401) {
        console.error('\n⚠️  AUTHENTICATION ERROR')
        console.error('Your API key is invalid or expired')
        console.error('Get a new key from: https://openrouter.ai/keys')
      } else if (error.response.status === 402) {
        console.error('\n⚠️  PAYMENT REQUIRED')
        console.error('Your OpenRouter account has no credits')
        console.error('Add credits at: https://openrouter.ai/credits')
      } else if (error.response.status === 429) {
        console.error('\n⚠️  RATE LIMIT EXCEEDED')
        console.error('Too many requests. Wait a moment and try again')
      }
    } else if (error.code === 'ECONNABORTED') {
      console.error('Request timed out after 30 seconds')
    } else {
      console.error('Error:', error.message)
    }
  }
}

console.log('\n')
=======
require('dotenv').config()
const axios = require('axios')

async function testOpenRouter() {
  console.log('==========================================')
  console.log('Testing OpenRouter API Connection')
  console.log('==========================================\n')
  
  const apiKey = process.env.OPENROUTER_API_KEY
  
  if (!apiKey) {
    console.error('❌ OPENROUTER_API_KEY not found in .env file!')
    return
  }
  
  console.log('✓ API Key found:', apiKey.substring(0, 20) + '...')
  console.log('✓ Key length:', apiKey.length, 'characters\n')
  
  console.log('Making test request...\n')
  
  try {
    const response = await axios.post(
      'https://openrouter.ai/api/v1/chat/completions',
      {
        model: 'deepseek/deepseek-r1-0528',
        messages: [
          { 
            role: 'user', 
            content: 'List 3 famous restaurants in Paris. For each, provide: NAME, DESCRIPTION, RATING (3.5-5.0), PRICE (1-4). Separate with ---'
          }
        ],
        temperature: 0.7,
        max_tokens: 1000
      },
      {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'http://localhost:5000',
          'X-Title': 'Planora Test'
        },
        timeout: 30000
      }
    )
    
    console.log('✅ SUCCESS! API is working!\n')
    console.log('Response status:', response.status)
    console.log('Model used:', response.data.model)
    console.log('\n--- AI Response ---')
    console.log(response.data.choices[0].message.content)
    console.log('-------------------\n')
    
    console.log('✓ OpenRouter API is configured correctly!')
    console.log('✓ Your backend should work now')
    
  } catch (error) {
    console.error('❌ API REQUEST FAILED!\n')
    
    if (error.response) {
      console.error('Status Code:', error.response.status)
      console.error('Status Text:', error.response.statusText)
      console.error('Error Data:', JSON.stringify(error.response.data, null, 2))
      
      if (error.response.status === 401) {
        console.error('\n⚠️  AUTHENTICATION ERROR')
        console.error('Your API key is invalid or expired')
        console.error('Get a new key from: https://openrouter.ai/keys')
      } else if (error.response.status === 402) {
        console.error('\n⚠️  PAYMENT REQUIRED')
        console.error('Your OpenRouter account has no credits')
        console.error('Add credits at: https://openrouter.ai/credits')
      } else if (error.response.status === 429) {
        console.error('\n⚠️  RATE LIMIT EXCEEDED')
        console.error('Too many requests. Wait a moment and try again')
      }
    } else if (error.code === 'ECONNABORTED') {
      console.error('Request timed out after 30 seconds')
    } else {
      console.error('Error:', error.message)
    }
  }
}

console.log('\n')
>>>>>>> 0007615a5a7317e8689fc9727726ee86c5585786
testOpenRouter()