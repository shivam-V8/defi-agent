import { Router } from 'express';
import { QuoteRequestSchema, QuoteResponseSchema } from '../schemas/quote.js';
import { QuoteService } from '../services/quoteService.js';

const router = Router();
const quoteService = QuoteService.getInstance();

/**
 * POST /v1/quote/best
 * Get the best quote by aggregating from multiple routers
 */
router.post('/best', async (req, res) => {
  try {
    // Validate request body
    const validatedRequest = QuoteRequestSchema.parse(req.body);
    
    // Set timeout for the request (5 seconds)
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Request timeout')), 5000);
    });

    // Get best quote with timeout
    const quotePromise = quoteService.getBestQuote(validatedRequest);
    
    const result = await Promise.race([quotePromise, timeoutPromise]);
    
    // Validate response
    const validatedResponse = QuoteResponseSchema.parse(result);
    
    res.json(validatedResponse);
    
  } catch (error) {
    console.error('Quote endpoint error:', error);
    
    if (error instanceof Error) {
      if (error.message === 'Request timeout') {
        return res.status(408).json({
          error: 'Request timeout',
          message: 'Quote request took too long to process',
        });
      }
      
      if (error.message.includes('validation')) {
        return res.status(400).json({
          error: 'Validation error',
          message: error.message,
        });
      }
    }
    
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to get quote',
    });
  }
});

/**
 * GET /v1/quote/tokens/:chainId
 * Get available tokens for a chain
 */
router.get('/tokens/:chainId', (req, res) => {
  try {
    const chainId = parseInt(req.params.chainId);
    
    if (isNaN(chainId)) {
      return res.status(400).json({
        error: 'Invalid chain ID',
        message: 'Chain ID must be a number',
      });
    }

    // Mock token list
    const tokens = {
      1: [ // Ethereum
        { address: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2', symbol: 'WETH', name: 'Wrapped Ether', decimals: 18 },
        { address: '0xA0b86a33E6441b8c4C8C0C4C0C4C0C4C0C4C0C4C', symbol: 'USDC', name: 'USD Coin', decimals: 6 },
        { address: '0x3845badAde8e6dDD04FcF80A4423B8B1C292c9bA', symbol: 'SAND', name: 'Sandbox', decimals: 18 },
        { address: '0xC011a73ee8576Fb46F5E1c5751cA3B9Fe0af2a6F', symbol: 'SNX', name: 'Synthetix', decimals: 18 },
      ],
      42161: [ // Arbitrum
        { address: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1', symbol: 'WETH', name: 'Wrapped Ether', decimals: 18 },
        { address: '0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8', symbol: 'USDC', name: 'USD Coin', decimals: 6 },
      ],
      10: [ // Optimism
        { address: '0x4200000000000000000000000000000000000006', symbol: 'WETH', name: 'Wrapped Ether', decimals: 18 },
        { address: '0x7F5c764cBc14f9669B88837ca1490cCa17c31607', symbol: 'USDC', name: 'USD Coin', decimals: 6 },
      ],
    };

    const chainTokens = tokens[chainId as keyof typeof tokens] || [];
    
    res.json({
      chainId,
      tokens: chainTokens,
    });
    
  } catch (error) {
    console.error('Tokens endpoint error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to get tokens',
    });
  }
});

/**
 * GET /v1/quote/routers/:chainId
 * Get available routers for a chain
 */
router.get('/routers/:chainId', (req, res) => {
  try {
    const chainId = parseInt(req.params.chainId);
    
    if (isNaN(chainId)) {
      return res.status(400).json({
        error: 'Invalid chain ID',
        message: 'Chain ID must be a number',
      });
    }

    const routers = quoteService.getAvailableRouters(chainId);
    
    res.json({
      chainId,
      routers: Object.entries(routers).map(([type, address]) => ({
        type,
        address,
      })),
    });
    
  } catch (error) {
    console.error('Routers endpoint error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to get routers',
    });
  }
});

export default router;
