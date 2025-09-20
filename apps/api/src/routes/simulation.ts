import { Router } from 'express';
import { SimulationRequestSchema, SimulationResponseSchema } from '../schemas/quote.js';
import { SimulationService } from '../services/simulationService.js';

const router = Router();
const simulationService = SimulationService.getInstance();

/**
 * POST /v1/simulate
 * Simulate a swap transaction using Tenderly
 */
router.post('/', async (req, res) => {
  try {
    // Validate request body
    const validatedRequest = SimulationRequestSchema.parse(req.body);
    
    // Set timeout for the request (10 seconds)
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Simulation timeout')), 10000);
    });

    // Run simulation with timeout
    const simulationPromise = simulationService.simulateTransaction(validatedRequest);
    
    const result = await Promise.race([simulationPromise, timeoutPromise]);
    
    // Validate response
    const validatedResponse = SimulationResponseSchema.parse(result);
    
    res.json(validatedResponse);
    
  } catch (error) {
    console.error('Simulation endpoint error:', error);
    
    if (error instanceof Error) {
      if (error.message === 'Simulation timeout') {
        return res.status(408).json({
          error: 'Simulation timeout',
          message: 'Simulation request took too long to process',
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
      message: 'Failed to simulate transaction',
    });
  }
});

/**
 * GET /v1/simulate/:simulationId
 * Get simulation status and results
 */
router.get('/:simulationId', async (req, res) => {
  try {
    const { simulationId } = req.params;
    
    if (!simulationId) {
      return res.status(400).json({
        error: 'Missing simulation ID',
        message: 'Simulation ID is required',
      });
    }

    // Set timeout for the request (5 seconds)
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Request timeout')), 5000);
    });

    // Get simulation status with timeout
    const statusPromise = simulationService.getSimulationStats();
    
    const result = await Promise.race([statusPromise, timeoutPromise]);
    
    res.json(result);
    
  } catch (error) {
    console.error('Simulation status endpoint error:', error);
    
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
      message: 'Failed to get simulation status',
    });
  }
});

/**
 * POST /v1/simulate/batch
 * Simulate multiple transactions in batch
 */
router.post('/batch', async (req, res) => {
  try {
    const { simulations } = req.body;
    
    if (!Array.isArray(simulations)) {
      return res.status(400).json({
        error: 'Invalid request',
        message: 'Simulations must be an array',
      });
    }

    if (simulations.length > 10) {
      return res.status(400).json({
        error: 'Too many simulations',
        message: 'Maximum 10 simulations per batch',
      });
    }

    // Validate each simulation request
    const validatedSimulations = simulations.map((sim, index) => {
      try {
        return SimulationRequestSchema.parse(sim);
      } catch (error) {
        throw new Error(`Simulation ${index + 1}: ${error instanceof Error ? error.message : 'Invalid data'}`);
      }
    });

    // Set timeout for the batch request (30 seconds)
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Batch simulation timeout')), 30000);
    });

    // Run all simulations in parallel
    const simulationPromises = validatedSimulations.map(sim => simulationService.simulateTransaction(sim));
    const results = await Promise.allSettled(simulationPromises);
    
    const batchResult = results.map((result, index) => ({
      index,
      success: result.status === 'fulfilled',
      result: result.status === 'fulfilled' ? result.value : null,
      error: result.status === 'rejected' ? result.reason?.message : null,
    }));

    res.json({
      batchId: `batch_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      totalSimulations: simulations.length,
      successfulSimulations: batchResult.filter(r => r.success).length,
      failedSimulations: batchResult.filter(r => !r.success).length,
      results: batchResult,
    });
    
  } catch (error) {
    console.error('Batch simulation endpoint error:', error);
    
    if (error instanceof Error) {
      if (error.message === 'Batch simulation timeout') {
        return res.status(408).json({
          error: 'Batch simulation timeout',
          message: 'Batch simulation request took too long to process',
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
      message: 'Failed to run batch simulation',
    });
  }
});

export default router;
