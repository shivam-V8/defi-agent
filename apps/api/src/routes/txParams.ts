import { Router } from 'express';
import { TxParamsRequestSchema, TxParamsResponseSchema } from '../schemas/quote.js';
import { TxParamsService } from '../services/txParamsService.js';

const router = Router();
const txParamsService = TxParamsService.getInstance();

/**
 * POST /v1/tx-params
 * Build transaction parameters for AgentExecutor contract
 */
router.post('/', async (req, res) => {
  try {
    // Validate request body
    const validatedRequest = TxParamsRequestSchema.parse(req.body);
    
    // Set timeout for the request (5 seconds)
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Request timeout')), 5000);
    });

    // Build transaction params with timeout
    const paramsPromise = txParamsService.buildTxParams(validatedRequest);
    
    const result = await Promise.race([paramsPromise, timeoutPromise]);
    
    // Validate response
    const validatedResponse = TxParamsResponseSchema.parse(result);
    
    res.json(validatedResponse);
    
  } catch (error) {
    console.error('TxParams endpoint error:', error);
    
    if (error instanceof Error) {
      if (error.message === 'Request timeout') {
        return res.status(408).json({
          error: 'Request timeout',
          message: 'Request took too long to process',
        });
      }
      
      if (error.message.includes('validation')) {
        return res.status(400).json({
          error: 'Validation error',
          message: error.message,
        });
      }
      
      if (error.message.includes('not deployed')) {
        return res.status(400).json({
          error: 'Contract not deployed',
          message: error.message,
        });
      }
    }
    
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to build transaction parameters',
    });
  }
});

/**
 * GET /v1/tx-params/agent-executor/:chainId
 * Get AgentExecutor contract address for a chain
 */
router.get('/agent-executor/:chainId', (req, res) => {
  try {
    const chainId = parseInt(req.params.chainId);
    
    if (isNaN(chainId)) {
      return res.status(400).json({
        error: 'Invalid chain ID',
        message: 'Chain ID must be a number',
      });
    }

    const agentExecutorAddress = txParamsService.getAgentExecutorAddress(chainId);
    
    if (!agentExecutorAddress) {
      return res.status(404).json({
        error: 'AgentExecutor not found',
        message: `AgentExecutor contract not deployed on chain ${chainId}`,
      });
    }

    res.json({
      chainId,
      agentExecutorAddress,
    });
    
  } catch (error) {
    console.error('AgentExecutor endpoint error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to get AgentExecutor address',
    });
  }
});

/**
 * POST /v1/tx-params/estimate-gas
 * Estimate gas for a transaction without building full params
 */
router.post('/estimate-gas', async (req, res) => {
  try {
    const { chainId, routerType, amountIn } = req.body;
    
    if (!chainId || !routerType || !amountIn) {
      return res.status(400).json({
        error: 'Missing required fields',
        message: 'chainId, routerType, and amountIn are required',
      });
    }

    // Create a minimal request for gas estimation
    const mockRequest = {
      tokenIn: '0x0000000000000000000000000000000000000000',
      tokenOut: '0x0000000000000000000000000000000000000000',
      amountIn,
      expectedOut: '0',
      minReceived: '0',
      chainId: parseInt(chainId),
      router: '0x0000000000000000000000000000000000000000',
      routerType,
      userAddress: '0x0000000000000000000000000000000000000000',
      deadline: Math.floor(Date.now() / 1000) + 1200,
      permitType: 'PERMIT2' as const,
    };

    // Set timeout for the request (3 seconds)
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Request timeout')), 3000);
    });

    // Estimate gas with timeout
    const gasEstimatePromise = txParamsService.buildTxParams(mockRequest).then(params => ({
      gasLimit: params.gasLimit,
      gasPrice: params.gasPrice,
    }));
    
    const result = await Promise.race([gasEstimatePromise, timeoutPromise]);
    
    res.json({
      chainId: parseInt(chainId),
      routerType,
      amountIn,
      gasEstimate: result,
    });
    
  } catch (error) {
    console.error('Gas estimation endpoint error:', error);
    
    if (error instanceof Error) {
      if (error.message === 'Request timeout') {
        return res.status(408).json({
          error: 'Request timeout',
          message: 'Request took too long to process',
        });
      }
    }
    
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to estimate gas',
    });
  }
});

export default router;
