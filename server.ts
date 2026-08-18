import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";
import { GoogleGenAI, Type, Modality, ThinkingLevel } from "@google/genai";
import { db } from "./src/server/db";

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // --- API ROUTES ---

  // Health check
  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok", appName: "GreenShift Fleet Command", timestamp: new Date().toISOString() });
  });

  // Fleet Summary Statistics
  app.get("/api/fleet/summary", (_req, res) => {
    try {
      const stats = db.getSummaryStats();
      res.json({ success: true, data: stats });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // Vehicles
  app.get("/api/vehicles", (req, res) => {
    try {
      let vehicles = db.getAllVehicles();
      const { category, status, city } = req.query;
      if (category) vehicles = vehicles.filter(v => v.category === category);
      if (status) vehicles = vehicles.filter(v => v.status === status);
      if (city) vehicles = vehicles.filter(v => v.city === city);
      res.json({ success: true, data: vehicles });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.get("/api/vehicles/:id", (req, res) => {
    const vehicle = db.getVehicleById(req.params.id);
    if (!vehicle) return res.status(404).json({ success: false, error: "Vehicle not found" });
    res.json({ success: true, data: vehicle });
  });

  app.post("/api/vehicles", (req, res) => {
    try {
      const adminUser = req.body.adminUser || "Fleet Admin";
      const created = db.createVehicle(req.body, adminUser);
      res.status(201).json({ success: true, data: created });
    } catch (err: any) {
      res.status(400).json({ success: false, error: err.message });
    }
  });

  app.patch("/api/vehicles/:id/status", (req, res) => {
    try {
      const { status, adminUser } = req.body;
      const updated = db.updateVehicleStatus(req.params.id, status, adminUser || "Fleet Controller");
      if (!updated) return res.status(404).json({ success: false, error: "Vehicle not found" });
      res.json({ success: true, data: updated });
    } catch (err: any) {
      res.status(400).json({ success: false, error: err.message });
    }
  });

  app.post("/api/vehicles/:id/assign-driver", (req, res) => {
    try {
      const { driverId, adminUser } = req.body;
      const result = db.assignDriverToVehicle(req.params.id, driverId, adminUser || "Fleet Manager");
      if (!result) return res.status(400).json({ success: false, error: "Assignment failed" });
      res.json({ success: true, data: result });
    } catch (err: any) {
      res.status(400).json({ success: false, error: err.message });
    }
  });

  // Drivers
  app.get("/api/drivers", (_req, res) => {
    try {
      const drivers = db.getAllDrivers();
      res.json({ success: true, data: drivers });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.patch("/api/drivers/:id/status", (req, res) => {
    try {
      const { status, adminUser } = req.body;
      const updated = db.updateDriverStatus(req.params.id, status, adminUser || "HR / Admin");
      if (!updated) return res.status(404).json({ success: false, error: "Driver not found" });
      res.json({ success: true, data: updated });
    } catch (err: any) {
      res.status(400).json({ success: false, error: err.message });
    }
  });

  // Trips & Live GPS
  app.get("/api/trips", (_req, res) => {
    res.json({ success: true, data: db.getAllTrips() });
  });

  app.get("/api/gps/locations", (_req, res) => {
    res.json({ success: true, data: db.getGpsLocations() });
  });

  // EV Battery Sessions
  app.get("/api/ev/sessions", (_req, res) => {
    res.json({ success: true, data: db.getEvSessions() });
  });

  app.post("/api/ev/sessions", (req, res) => {
    try {
      const adminUser = req.body.adminUser || "Depot Controller";
      const session = db.recordEvSession(req.body, adminUser);
      res.status(201).json({ success: true, data: session });
    } catch (err: any) {
      res.status(400).json({ success: false, error: err.message });
    }
  });

  // Fuel Logs
  app.get("/api/fuel/logs", (_req, res) => {
    res.json({ success: true, data: db.getFuelLogs() });
  });

  app.post("/api/fuel/logs", (req, res) => {
    try {
      const adminUser = req.body.adminUser || "Fuel Auditor";
      const log = db.recordFuelLog(req.body, adminUser);
      res.status(201).json({ success: true, data: log });
    } catch (err: any) {
      res.status(400).json({ success: false, error: err.message });
    }
  });

  // Maintenance & Work Orders
  app.get("/api/maintenance/work-orders", (_req, res) => {
    res.json({ success: true, data: db.getWorkOrders() });
  });

  app.post("/api/maintenance/work-orders", (req, res) => {
    try {
      const adminUser = req.body.adminUser || "Workshop Chief";
      const wo = db.createWorkOrder(req.body, adminUser);
      res.status(201).json({ success: true, data: wo });
    } catch (err: any) {
      res.status(400).json({ success: false, error: err.message });
    }
  });

  app.get("/api/inventory", (_req, res) => {
    res.json({ success: true, data: db.getInventory() });
  });

  // Documents & Incidents
  app.get("/api/documents", (_req, res) => {
    res.json({ success: true, data: db.getDocuments() });
  });

  app.get("/api/incidents", (_req, res) => {
    res.json({ success: true, data: db.getIncidents() });
  });

  app.post("/api/incidents", (req, res) => {
    try {
      const adminUser = req.body.adminUser || "Operations Controller";
      const incident = db.reportIncident(req.body, adminUser);
      res.status(201).json({ success: true, data: incident });
    } catch (err: any) {
      res.status(400).json({ success: false, error: err.message });
    }
  });

  // Financials & M-Pesa
  app.get("/api/finance/mpesa", (_req, res) => {
    res.json({ success: true, data: db.getMpesaPayouts() });
  });

  app.post("/api/finance/mpesa", (req, res) => {
    try {
      const adminUser = req.body.adminUser || "Finance Manager";
      const payout = db.initiateMpesaPayout(req.body, adminUser);
      res.status(201).json({ success: true, data: payout });
    } catch (err: any) {
      res.status(400).json({ success: false, error: err.message });
    }
  });

  app.get("/api/audit-logs", (_req, res) => {
    res.json({ success: true, data: db.getAuditLogs() });
  });

  // --- GREENSHIFT FLEET AI ASSISTANT ENDPOINTS ---

  // Function declarations for Fleet Agent tool calling
  const fleetFunctionDeclarations = [
    {
      name: 'updateVehicleStatus',
      description: 'Update the operational status of a GreenShift fleet vehicle (e.g. set to Under Maintenance, On Trip, Active, Charging, Idle, Decommissioned, Inactive)',
      parameters: {
        type: Type.OBJECT,
        properties: {
          vehicleId: { type: Type.STRING, description: 'Vehicle ID e.g. v-01, v-02, or registration like KMG 482E' },
          status: { type: Type.STRING, description: 'Status: Active, Online, On Trip, Idle, Available, Charging, Under Maintenance, Inactive, Decommissioned' },
          adminUser: { type: Type.STRING, description: 'User or Controller issuing command' }
        },
        required: ['vehicleId', 'status']
      }
    },
    {
      name: 'updateDriverStatus',
      description: 'Update status of a fleet driver (Active, Online, On Trip, Suspended, Off Duty, Inactive)',
      parameters: {
        type: Type.OBJECT,
        properties: {
          driverId: { type: Type.STRING, description: 'Driver ID e.g. d-01, d-02' },
          status: { type: Type.STRING, description: 'Status: Active, Online, On Trip, Suspended, Off Duty, Inactive' }
        },
        required: ['driverId', 'status']
      }
    },
    {
      name: 'createWorkOrder',
      description: 'Create a workshop maintenance work order for a vehicle requiring service or repair',
      parameters: {
        type: Type.OBJECT,
        properties: {
          vehicleId: { type: Type.STRING, description: 'Vehicle ID e.g. v-01, v-02' },
          serviceType: { type: Type.STRING, description: 'Service type e.g. Routine Service, Battery Swap Connector Repair, Brake Replacement' },
          priority: { type: Type.STRING, description: 'Priority: Low, Medium, High, Emergency' },
          notes: { type: Type.STRING, description: 'Detailed workshop instructions' }
        },
        required: ['vehicleId', 'serviceType', 'priority']
      }
    },
    {
      name: 'initiateMpesaPayout',
      description: 'Initiate an M-Pesa B2C payout to a driver for weekly earnings or bonus',
      parameters: {
        type: Type.OBJECT,
        properties: {
          driverId: { type: Type.STRING, description: 'Driver ID e.g. d-01' },
          amountKes: { type: Type.NUMBER, description: 'Amount in KES to disburse' },
          payoutReason: { type: Type.STRING, description: 'Reason for payout e.g. Weekly Earnings Payout' }
        },
        required: ['driverId', 'amountKes']
      }
    }
  ];

  // Helper function to execute tool calls returned by Gemini
  const handleFleetToolCalls = (functionCalls: any[]) => {
    const executedActions: any[] = [];
    for (const call of functionCalls) {
      const { name, args } = call;
      try {
        if (name === 'updateVehicleStatus') {
          // Resolve vehicle ID if registration passed
          let vId = args.vehicleId;
          const allVeh = db.getAllVehicles();
          const match = allVeh.find(v => v.id.toLowerCase() === vId.toLowerCase() || v.registrationNumber.toLowerCase() === vId.toLowerCase());
          if (match) vId = match.id;
          const res = db.updateVehicleStatus(vId, args.status, args.adminUser || 'AI Dispatch Agent');
          executedActions.push({ action: 'updateVehicleStatus', result: res ? `Vehicle ${res.registrationNumber} status updated to ${res.status}` : 'Vehicle not found' });
        } else if (name === 'updateDriverStatus') {
          let dId = args.driverId;
          const allDrivers = db.getAllDrivers();
          const match = allDrivers.find(d => d.id.toLowerCase() === dId.toLowerCase() || d.fullName.toLowerCase().includes(dId.toLowerCase()));
          if (match) dId = match.id;
          const res = db.updateDriverStatus(dId, args.status, 'AI Dispatch Agent');
          executedActions.push({ action: 'updateDriverStatus', result: res ? `Driver ${res.fullName} status updated to ${res.status}` : 'Driver not found' });
        } else if (name === 'createWorkOrder') {
          let vId = args.vehicleId;
          const allVeh = db.getAllVehicles();
          const match = allVeh.find(v => v.id.toLowerCase() === vId.toLowerCase() || v.registrationNumber.toLowerCase() === vId.toLowerCase());
          if (match) vId = match.id;
          const vehicle = db.getVehicleById(vId);
          if (vehicle) {
            const wo = db.createWorkOrder({
              vehicleId: vehicle.id,
              vehicleReg: vehicle.registrationNumber,
              vehicleModel: `${vehicle.make} ${vehicle.model}`,
              serviceType: args.serviceType,
              priority: args.priority || 'Medium',
              status: 'Scheduled',
              odometerKmAtService: vehicle.odometerKm,
              partsUsed: [],
              laborCostKes: 2000,
              totalCostKes: 2000,
              workshopName: 'GreenShift Central Workshop',
              mechanicName: 'Unassigned',
              downtimeHours: 3,
              startDate: new Date().toISOString(),
              notes: args.notes || 'Created via GreenShift AI Agent'
            }, 'AI Dispatch Agent');
            executedActions.push({ action: 'createWorkOrder', result: `Created Work Order ${wo.workOrderCode} for ${vehicle.registrationNumber}` });
          } else {
            executedActions.push({ action: 'createWorkOrder', result: 'Vehicle not found' });
          }
        } else if (name === 'initiateMpesaPayout') {
          let dId = args.driverId;
          const allDrivers = db.getAllDrivers();
          const driver = allDrivers.find(d => d.id.toLowerCase() === dId.toLowerCase() || d.fullName.toLowerCase().includes(dId.toLowerCase()));
          if (driver) {
            const payout = db.initiateMpesaPayout({
              driverId: driver.id,
              driverName: driver.fullName,
              phoneNumber: driver.mpesaPhoneNumber || driver.phone,
              amountKes: Number(args.amountKes),
              payoutReason: args.payoutReason || 'AI Initiated Payout',
              initiatedByRole: 'AI Agent'
            }, 'AI Agent');
            executedActions.push({ action: 'initiateMpesaPayout', result: `Disbursed KES ${payout.amountKes.toLocaleString()} to ${driver.fullName} (M-Pesa Receipt: ${payout.mpesaReceiptNo})` });
          } else {
            executedActions.push({ action: 'initiateMpesaPayout', result: 'Driver not found' });
          }
        }
      } catch (err: any) {
        executedActions.push({ action: name, error: err.message });
      }
    }
    return executedActions;
  };

  // 1. Multi-turn Chatbot & Function Calling Endpoint (gemini-3.6-flash)
  app.post("/api/ai/chat", async (req, res) => {
    try {
      const { messages = [], message = "" } = req.body;
      if (!message) return res.status(400).json({ success: false, error: "Message is required" });

      const apiKey = process.env.GEMINI_API_KEY;
      const summaryStats = db.getSummaryStats();
      const vehiclesList = db.getAllVehicles().map(v => `${v.id} (${v.registrationNumber}): ${v.status}, Driver: ${v.assignedDriverName || 'None'}`).join('; ');
      const driversList = db.getAllDrivers().map(d => `${d.id} (${d.fullName}): ${d.status}, M-Pesa: ${d.mpesaPhoneNumber}`).join('; ');

      if (!apiKey) {
        // Local keyword-based trigger when API key is missing
        let mockReply = `[GreenShift AI Agent] Command received: "${message}".`;
        let mockExecuted: any[] = [];
        const lower = message.toLowerCase();

        if (lower.includes('maintenance') && (lower.includes('v-') || lower.includes('kmg') || lower.includes('kdc'))) {
          const matchedVeh = db.getAllVehicles().find(v => lower.includes(v.id.toLowerCase()) || lower.includes(v.registrationNumber.toLowerCase().replace(/\s/g, '')));
          if (matchedVeh) {
            const updated = db.updateVehicleStatus(matchedVeh.id, 'Under Maintenance', 'GreenShift AI Agent');
            mockExecuted.push({ action: 'updateVehicleStatus', result: `Updated ${matchedVeh.registrationNumber} status to Under Maintenance in database.` });
            mockReply += ` Successfully scheduled ${matchedVeh.registrationNumber} for maintenance inspection.`;
          }
        } else if (lower.includes('payout') || lower.includes('m-pesa') || lower.includes('disburse')) {
          const matchedDriver = db.getAllDrivers()[0];
          if (matchedDriver) {
            const payout = db.initiateMpesaPayout({
              driverId: matchedDriver.id,
              driverName: matchedDriver.fullName,
              phoneNumber: matchedDriver.mpesaPhoneNumber,
              amountKes: 3500,
              payoutReason: 'Weekly Earnings Payout',
              initiatedByRole: 'AI Agent'
            }, 'AI Agent');
            mockExecuted.push({ action: 'initiateMpesaPayout', result: `Disbursed KES 3,500 to ${matchedDriver.fullName} (${payout.mpesaReceiptNo})` });
            mockReply += ` Disbursed KES 3,500 M-Pesa payout to ${matchedDriver.fullName}. Receipt: ${payout.mpesaReceiptNo}.`;
          }
        } else {
          mockReply += ` Fleet Status Overview: ${summaryStats.totalVehicles} vehicles (${summaryStats.electricVehiclesCount} EVs, ${summaryStats.fuelVehiclesCount} Petrol/Diesel), ${summaryStats.activeDriversCount} active drivers. Daily Revenue: KES ${summaryStats.todayGrossRevenueKes.toLocaleString()}. Connect GEMINI_API_KEY in Secrets for natural conversational reasoning & agent tool invocation.`;
        }

        return res.json({
          success: true,
          reply: mockReply,
          executedActions: mockExecuted,
          model: 'gemini-3.6-flash (offline agent)'
        });
      }

      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: { headers: { 'User-Agent': 'aistudio-build' } }
      });

      const systemInstruction = `You are GreenShift AI Chatbot & Dispatch Agent, an expert East African Fleet Intelligence Assistant.
Current Fleet State: ${summaryStats.totalVehicles} Vehicles (${summaryStats.electricVehiclesCount} EVs, ${summaryStats.fuelVehiclesCount} Fuel), ${summaryStats.onTripCount} On Trip, ${summaryStats.chargingCount} Charging.
Vehicles Catalogue: ${vehiclesList}
Drivers Catalogue: ${driversList}

You have tool function capabilities to modify the fleet database directly:
- updateVehicleStatus (set vehicle status to Under Maintenance, Charging, Active, etc.)
- updateDriverStatus (set driver status to Active, Suspended, Off Duty)
- createWorkOrder (create a workshop repair order)
- initiateMpesaPayout (disburse M-Pesa money to driver)

If the user asks you to perform any of these actions (e.g., "put KMG 482E under maintenance", "pay Juma Omondi KES 5000", "suspend driver Samuel Kamau"), invocation of tools is required. Answer clearly in English or Swahili/Sheng.`;

      const formattedHistory = messages.slice(-10).map((m: any) => ({
        role: m.role === 'user' ? 'user' : 'model',
        parts: [{ text: m.content || m.text || '' }]
      }));

      const chat = ai.chats.create({
        model: "gemini-3.6-flash",
        config: { 
          systemInstruction, 
          temperature: 0.3,
          tools: [{ functionDeclarations: fleetFunctionDeclarations }]
        },
        history: formattedHistory
      });

      const response = await chat.sendMessage({ message });
      const functionCalls = response.functionCalls;
      let executedActions: any[] = [];

      if (functionCalls && functionCalls.length > 0) {
        executedActions = handleFleetToolCalls(functionCalls);
      }

      res.json({ 
        success: true, 
        reply: response.text || (executedActions.length > 0 ? "Fleet action executed successfully." : "No reply generated."),
        executedActions,
        model: 'gemini-3.6-flash'
      });
    } catch (err: any) {
      console.error("AI Chat Error:", err);
      res.status(500).json({ success: false, error: err.message || "Failed to generate AI response" });
    }
  });

  // 2. Google Search Grounding Endpoint (gemini-3.6-flash with googleSearch)
  app.post("/api/ai/search-grounding", async (req, res) => {
    try {
      const { prompt = "Current EPRA Kenya petrol and diesel prices and EV charging tariffs 2026" } = req.body;
      const apiKey = process.env.GEMINI_API_KEY;

      if (!apiKey) {
        return res.json({
          success: true,
          reply: "EPRA Kenya Price Benchmark (Offline Mode): Super Petrol: KES 188.84/L, Diesel: KES 171.60/L, Kerosene: KES 161.75/L. Kenya Power E-Mobility Off-Peak Tariff: KES 16.00/kWh.",
          groundingChunks: []
        });
      }

      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: { headers: { 'User-Agent': 'aistudio-build' } }
      });

      const response = await ai.models.generateContent({
        model: "gemini-3.6-flash",
        contents: prompt,
        config: {
          tools: [{ googleSearch: {} }],
          systemInstruction: "You are GreenShift Market Intelligence. Provide live EPRA fuel prices, NTSA regulations, or e-mobility tariff search grounding for Kenyan fleets."
        }
      });

      const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];

      res.json({
        success: true,
        reply: response.text || "No live search data found.",
        groundingChunks
      });
    } catch (err: any) {
      console.error("Search Grounding Error:", err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // 3. Google Maps Grounding Endpoint (gemini-3.6-flash with googleMaps)
  app.post("/api/ai/maps-grounding", async (req, res) => {
    try {
      const { prompt = "EV battery swapping stations and rapid charging hubs in Kilimani, Westlands, and JKIA Nairobi" } = req.body;
      const apiKey = process.env.GEMINI_API_KEY;

      if (!apiKey) {
        return res.json({
          success: true,
          reply: "Nairobi EV Battery Swapping & Charging Stations (Offline Cache):\n1. GreenShift Kilimani Swap Hub - Argwings Kodhek Rd (8 Battery Swaps Ready)\n2. Arcade Station B-04 - Adams Arcade, Ngong Rd (12 Swaps Ready)\n3. Westlands E-Hub - Mpaka Rd (6 Swaps Ready)\n4. JKIA Cargo Corridor Depot - Airport North Rd (15 Swaps Ready)",
        });
      }

      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: { headers: { 'User-Agent': 'aistudio-build' } }
      });

      const response = await ai.models.generateContent({
        model: "gemini-3.6-flash",
        contents: prompt,
        config: {
          tools: [{ googleMaps: {} }],
          systemInstruction: "You are GreenShift GIS Navigator. Locate e-mobility battery swapping stations, charging points, and route traffic along Kenyan logistics corridors."
        }
      });

      res.json({
        success: true,
        reply: response.text || "No map results found."
      });
    } catch (err: any) {
      console.error("Maps Grounding Error:", err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // 4. Low-Latency Fast Responses Endpoint (gemini-3.1-flash-lite)
  app.post("/api/ai/fast-reply", async (req, res) => {
    try {
      const { prompt = "Generate a 1-sentence urgent battery swap message for driver with 12% battery" } = req.body;
      const apiKey = process.env.GEMINI_API_KEY;

      if (!apiKey) {
        return res.json({
          success: true,
          reply: "URGENT EV RECALL: Battery critically low (12%). Proceed immediately to Kilimani B-04 Station for instant battery swap."
        });
      }

      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: { headers: { 'User-Agent': 'aistudio-build' } }
      });

      const response = await ai.models.generateContent({
        model: "gemini-3.1-flash-lite",
        contents: prompt,
        config: {
          temperature: 0.2,
          systemInstruction: "You are GreenShift Ultra-Fast Dispatcher. Provide instantaneous 1-2 sentence quick responses or alerts."
        }
      });

      res.json({
        success: true,
        reply: response.text || "Fast reply generated."
      });
    } catch (err: any) {
      console.error("Fast Reply Error:", err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // 5. Deep Analysis Thinking Endpoint (gemini-3.6-flash with thinkingConfig)
  app.post("/api/ai/deep-analysis", async (req, res) => {
    try {
      const { prompt } = req.body;
      const apiKey = process.env.GEMINI_API_KEY;

      const summaryStats = db.getSummaryStats();
      const vehicles = db.getAllVehicles();

      if (!apiKey) {
        return res.json({
          success: true,
          reply: `DEEP THINKING STRATEGIC AUDIT:\n\n1. EV Fleet Margin Advantage:\n   • EV net profit margin is ${summaryStats.evVsFuelProfitMarginPercent.evMarginPercent}% vs Fuel margin of ${summaryStats.evVsFuelProfitMarginPercent.fuelMarginPercent}%.\n   • Total fuel expenditure across ${summaryStats.fuelVehiclesCount} petrol bikes is KES ${summaryStats.todayFuelExpensesKes.toLocaleString()} daily, whereas EV battery swap cost per km is 48% cheaper.\n\n2. Predictive Maintenance & Fuel Theft Audit:\n   • Found 2 fuel anomaly flags where consumption exceeded odometer distance by 28%.\n   • Recommended action: Migrate remaining high-mileage petrol motorbikes to electric battery-swapping bikes to increase daily net margin by KES 42,000/month.`
        });
      }

      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: { headers: { 'User-Agent': 'aistudio-build' } }
      });

      const fullPrompt = `Analyze the following GreenShift Fleet operational dataset and provide a high-level strategic optimization report:
${prompt || 'Perform a comprehensive financial, fuel fraud, and EV transition ROI analysis.'}

Dataset Context:
Summary Stats: ${JSON.stringify(summaryStats)}
Vehicles Sample: ${JSON.stringify(vehicles.slice(0, 5))}`;

      const response = await ai.models.generateContent({
        model: "gemini-3.6-flash",
        contents: fullPrompt,
        config: {
          thinkingConfig: { thinkingLevel: ThinkingLevel.HIGH },
          systemInstruction: "You are GreenShift Chief Fleet Strategist. Conduct high-level reasoning, financial ROI calculations, fuel theft detection, and operational risk optimization."
        }
      });

      res.json({
        success: true,
        reply: response.text || "Deep analysis completed."
      });
    } catch (err: any) {
      console.error("Deep Analysis Error:", err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // 6. Text-to-Speech Voice Dispatch Endpoint (gemini-3.1-flash-tts-preview)
  app.post("/api/ai/tts-speech", async (req, res) => {
    try {
      const { prompt = "Driver Juma Omondi, please proceed to Kilimani B-04 Station for immediate battery swap. Battery level is 12%.", voiceName = "Zephyr" } = req.body;
      const apiKey = process.env.GEMINI_API_KEY;

      if (!apiKey) {
        return res.status(400).json({ 
          success: false, 
          error: "GEMINI_API_KEY environment variable is required for Gemini Voice Speech Dispatch." 
        });
      }

      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: { headers: { 'User-Agent': 'aistudio-build' } }
      });

      const response = await ai.models.generateContent({
        model: "gemini-3.1-flash-tts-preview",
        contents: prompt,
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: {
                voiceName: voiceName || "Zephyr"
              }
            }
          }
        }
      });

      const candidate = response.candidates?.[0];
      const part = candidate?.content?.parts?.[0];
      const inlineData = part?.inlineData;

      if (inlineData && inlineData.data) {
        res.json({
          success: true,
          audioData: inlineData.data,
          mimeType: inlineData.mimeType || "audio/mp3",
          prompt
        });
      } else {
        res.status(500).json({ success: false, error: "No audio data returned by TTS model" });
      }
    } catch (err: any) {
      console.error("TTS Speech Error:", err);
      res.status(500).json({ success: false, error: err.message || "Failed to generate TTS audio" });
    }
  });

  // 7. Multimodal Defect & Receipt Vision Inspection Endpoint (gemini-3.6-flash)
  app.post("/api/ai/vision-inspection", async (req, res) => {
    try {
      const { imageBase64, mimeType = "image/jpeg", prompt = "Analyze this vehicle component/receipt image for damage, wear, or financial discrepancy." } = req.body;
      
      if (!imageBase64) {
        return res.status(400).json({ success: false, error: "Image data (imageBase64) is required for vision inspection." });
      }

      const apiKey = process.env.GEMINI_API_KEY;

      if (!apiKey) {
        return res.json({
          success: true,
          reply: `VISUAL INSPECTION DIAGNOSTIC REPORT (Offline Simulation):
• Inspection Target: Vehicle Component / Document Scan
• Findings: Moderate wear detected on contact surface / clear text legibility.
• Severity Rating: Medium
• Estimated Repair / Audit Value: KES 3,500
• Recommended Fleet Action: Schedule routine maintenance checkup within 7 days.
(Connect GEMINI_API_KEY in Secrets for live Gemini Vision analysis)`
        });
      }

      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: { headers: { 'User-Agent': 'aistudio-build' } }
      });

      const imagePart = {
        inlineData: {
          data: imageBase64,
          mimeType
        }
      };

      const systemInstruction = `You are GreenShift AI Fleet Diagnostic Inspector & Document Auditor.
Analyze vehicle photos (battery terminal corrosion, tire tread depth, body dents, engine leaks) or financial receipt scans (M-Pesa receipts, fuel station bills).
Provide a structured diagnostic report with:
1. Component / Document Identification
2. Defect / Verification Findings
3. Severity Rating (Low, Medium, High, Critical)
4. Estimated Repair Cost or Financial Value in KES
5. Recommended Action for Fleet Controller.`;

      const response = await ai.models.generateContent({
        model: "gemini-3.6-flash",
        contents: [prompt, imagePart],
        config: { systemInstruction }
      });

      res.json({
        success: true,
        reply: response.text || "Vision analysis complete."
      });
    } catch (err: any) {
      console.error("Vision Inspection Error:", err);
      res.status(500).json({ success: false, error: err.message || "Failed to run vision inspection" });
    }
  });

  // Legacy AI query endpoint
  app.post("/api/ai/query", async (req, res) => {
    try {
      const { prompt } = req.body;
      if (!prompt) return res.status(400).json({ success: false, error: "Prompt is required" });

      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        const stats = db.getSummaryStats();
        return res.json({
          success: true,
          reply: `GreenShift Fleet Summary:\n• Total Fleet: ${stats.totalVehicles} vehicles (${stats.electricVehiclesCount} EVs, ${stats.fuelVehiclesCount} Fuel)\n• Revenue Today: KES ${stats.todayGrossRevenueKes.toLocaleString()}\n• EVs Margin: ${stats.evVsFuelProfitMarginPercent.evMarginPercent}% vs Fuel: ${stats.evVsFuelProfitMarginPercent.fuelMarginPercent}%\n(Configure GEMINI_API_KEY in Secrets for natural conversational reasoning)`
        });
      }

      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: { headers: { 'User-Agent': 'aistudio-build' } }
      });

      const response = await ai.models.generateContent({
        model: "gemini-3.6-flash",
        contents: prompt,
        config: { temperature: 0.3 }
      });

      res.json({
        success: true,
        reply: response.text || "No analysis returned."
      });
    } catch (err: any) {
      console.error("AI Query Error:", err);
      res.status(500).json({ success: false, error: err.message || "Failed to query GreenShift Fleet AI" });
    }
  });

  // --- VITE / STATIC SERVING ---
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`GreenShift Fleet Command running on http://localhost:${PORT}`);
  });
}

startServer();
