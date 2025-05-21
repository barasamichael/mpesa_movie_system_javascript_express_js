const express = require('express');
const bodyParser = require('body-parser');
const mysql = require('mysql2/promise');
const axios = require('axios');
const dotenv = require('dotenv');
const cors = require('cors');
const path = require('path');

// Load environment variables
dotenv.config();

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Database configuration
const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'movie_tickets',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
};

// M-Pesa configuration
const mpesaConfig = {
    baseUrl: process.env.MPESA_BASE_URL || 'https://sandbox.safaricom.co.ke',
    accessTokenUrl: process.env.MPESA_ACCESS_TOKEN_URL || 'oauth/v1/generate?grant_type=client_credentials',
    stkPushUrl: process.env.MPESA_STK_PUSH_URL || 'mpesa/stkpush/v1/processrequest',
    stkQueryUrl: process.env.MPESA_STK_QUERY_URL || 'mpesa/stkpushquery/v1/query',
    businessShortCode: process.env.MPESA_BUSINESS_SHORT_CODE || '174379',
    passkey: process.env.MPESA_PASSKEY || 'bfb279f9aa9bdbcf158e97dd71a467cd2e0c893059b10f78e6b72ada1ed2c919',
    tillNumber: process.env.MPESA_TILL_NUMBER || '174379',
    callbackUrl: process.env.MPESA_CALLBACK_URL || 'https://mydomain.com/api/mpesa-callback',
    consumerKey: process.env.MPESA_CONSUMER_KEY || 'E7RkuNKKVFG3p2nWjEM78RcbFOwH2qb5UHpGvpOhzodFGbHV',
    consumerSecret: process.env.MPESA_CONSUMER_SECRET || 'tQw44mUODFBqUk25oS5NweJBMrlvdWwkYdap6P3895kekW2LmLFcHT4Lvjr4figm'
};

// Create database connection pool
const pool = mysql.createPool(dbConfig);

// Database initialization function
async function initializeDatabase() {
    try {
        const connection = await pool.getConnection();

        // Create Movie table
        await connection.query(`
      CREATE TABLE IF NOT EXISTS movie (
        movieId INT AUTO_INCREMENT PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        showTime DATETIME NOT NULL,
        price DECIMAL(10, 2) NOT NULL,
        max_tickets INT NOT NULL DEFAULT 100,
        imageUrl VARCHAR(255),
        dateCreated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        lastUpdated TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);

        // Create Ticket table
        await connection.query(`
      CREATE TABLE IF NOT EXISTS ticket (
        ticketId INT AUTO_INCREMENT PRIMARY KEY,
        movieId INT NOT NULL,
        customerName VARCHAR(255) NOT NULL,
        phoneNumber VARCHAR(20) NOT NULL,
        quantity INT NOT NULL,
        totalAmount DECIMAL(10, 2) NOT NULL,
        paymentStatus ENUM('Pending', 'Paid', 'Failed') NOT NULL DEFAULT 'Pending',
        mpesaReceiptNumber VARCHAR(100),
        transactionDate DATETIME,
        dateCreated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        lastUpdated TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        CONSTRAINT fk_Ticket_Movie FOREIGN KEY (movieId) REFERENCES movie(movieId) ON DELETE CASCADE
      )
    `);

        // Create PushRequest table
        await connection.query(`
      CREATE TABLE IF NOT EXISTS pushrequest (
        pushRequestId INT AUTO_INCREMENT PRIMARY KEY,
        ticketId INT NOT NULL,
        checkoutRequestId VARCHAR(255) NOT NULL,
        dateCreated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        lastUpdated TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        CONSTRAINT fk_PushRequest_Ticket FOREIGN KEY (ticketId) REFERENCES ticket(ticketId) ON DELETE CASCADE
      )
    `);

        // Check if any movies exist, if not add sample data
        const [movies] = await connection.query('SELECT COUNT(*) as count FROM movie');

        if (movies[0].count === 0) {
            // Insert sample movie data
            await connection.query(`
        INSERT INTO movie (title, description, showTime, price, max_tickets, imageUrl) VALUES
        ('The Matrix Resurrections', 'A new chapter in the sci-fi franchise.', '2025-06-15 18:30:00', 500.00, 200, 'https://example.com/matrix.jpg'),
        ('Dune: Part Two', 'The epic saga continues.', '2025-06-16 20:00:00', 450.00, 150, 'https://example.com/dune.jpg'),
        ('The Avengers: New Age', 'Marvel heroes unite again.', '2025-06-17 19:00:00', 550.00, 250, 'https://example.com/avengers.jpg')
      `);
            console.log('Sample movie data added');
        }

        connection.release();
        console.log('Database initialized successfully');
    } catch (error) {
        console.error('Database initialization error:', error);
        process.exit(1);
    }
}

// Helper Functions

/**
 * Format phone number for M-Pesa API
 * @param {string} phoneNumber - Raw phone number
 * @returns {string} - Formatted phone number (2547XXXXXXXX)
 */
function formatPhoneNumber(phoneNumber) {
    // Remove any non-digit characters
    phoneNumber = phoneNumber.replace(/\D/g, '');

    // Check if the number starts with '0' and replace with '254'
    if (phoneNumber.startsWith('0')) {
        phoneNumber = '254' + phoneNumber.substring(1);
    }

    // Check if the number starts with '+254' and remove the '+'
    else if (phoneNumber.startsWith('+254')) {
        phoneNumber = phoneNumber.substring(1);
    }

    // Check if the number doesn't have the country code and add it
    else if (!phoneNumber.startsWith('254')) {
        phoneNumber = '254' + phoneNumber;
    }

    return phoneNumber;
}

/**
 * Get M-Pesa access token
 * @returns {Promise<string|null>} - Access token or null if failed
 */
async function getMpesaAccessToken() {
    try {
        const auth = Buffer.from(`${mpesaConfig.consumerKey}:${mpesaConfig.consumerSecret}`).toString('base64');
        const response = await axios({
            method: 'get',
            url: `${mpesaConfig.baseUrl}/${mpesaConfig.accessTokenUrl}`,
            headers: {
                'Authorization': `Basic ${auth}`
            }
        });

        return response.data.access_token;
    } catch (error) {
        console.error('Error getting M-Pesa access token:', error.message);
        return null;
    }
}

// API Routes

// Root endpoint
app.get('/', (req, res) => {
    res.json({ message: 'Welcome to the Movie Ticket System API' });
});

// Get all movies
app.get('/api/movies', async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM movie');

        // Format decimal values
        const movies = rows.map(movie => ({
            ...movie,
            price: parseFloat(movie.price)
        }));

        res.json({ movies });
    } catch (error) {
        console.error('Error getting movies:', error);
        res.status(500).json({ error: error.message });
    }
});

// Get movie by ID
app.get('/api/movies/:id', async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM movie WHERE movieId = ?', [req.params.id]);

        if (rows.length === 0) {
            return res.status(404).json({ error: 'Movie not found' });
        }

        // Format decimal values
        const movie = {
            ...rows[0],
            price: parseFloat(rows[0].price)
        };

        res.json({ movie });
    } catch (error) {
        console.error('Error getting movie:', error);
        res.status(500).json({ error: error.message });
    }
});

// Add a new movie
app.post('/api/movies', async (req, res) => {
    try {
        const { title, description, showTime, price, max_tickets, imageUrl } = req.body;

        // Validate required fields
        if (!title || !showTime || !price) {
            return res.status(400).json({ error: 'Missing required fields: title, showTime, price' });
        }

        const [result] = await pool.query(
            'INSERT INTO movie (title, description, showTime, price, max_tickets, imageUrl) VALUES (?, ?, ?, ?, ?, ?)',
            [title, description || null, showTime, price, max_tickets || 100, imageUrl || null]
        );

        // Get the inserted movie
        const [rows] = await pool.query('SELECT * FROM movie WHERE movieId = ?', [result.insertId]);

        // Format decimal values
        const movie = {
            ...rows[0],
            price: parseFloat(rows[0].price)
        };

        res.status(201).json({ message: 'Movie added successfully', movie });
    } catch (error) {
        console.error('Error adding movie:', error);
        res.status(500).json({ error: error.message });
    }
});

// Purchase ticket (get all movies)
app.get('/api/purchase-ticket', async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM movie');

        // Format decimal values
        const movies = rows.map(movie => ({
            ...movie,
            price: parseFloat(movie.price)
        }));

        res.json({ movies });
    } catch (error) {
        console.error('Error getting movies for purchase:', error);
        res.status(500).json({ error: error.message });
    }
});

// Make payment (initiate M-Pesa STK push)
app.post('/api/make-payment', async (req, res) => {
    try {
        const { movieId, customerName, phoneNumber, quantity } = req.body;

        // Validate required fields
        if (!movieId || !customerName || !phoneNumber || !quantity) {
            return res.status(400).json({
                error: 'Missing required fields: movieId, customerName, phoneNumber, quantity'
            });
        }

        // Get the movie
        const [movies] = await pool.query('SELECT * FROM movie WHERE movieId = ?', [movieId]);

        if (movies.length === 0) {
            return res.status(404).json({ error: 'Movie not found' });
        }

        const movie = movies[0];
        const quantityNum = parseInt(quantity);

        // Check if enough tickets are available
        const [ticketsSoldResult] = await pool.query(
            'SELECT COALESCE(SUM(quantity), 0) as tickets_sold FROM ticket WHERE movieId = ? AND paymentStatus = "Paid"',
            [movieId]
        );

        const ticketsSold = parseInt(ticketsSoldResult[0].tickets_sold);

        if (ticketsSold + quantityNum > movie.max_tickets) {
            return res.status(400).json({
                error: `Not enough tickets available. Only ${movie.max_tickets - ticketsSold} left.`
            });
        }

        // Calculate total amount
        const totalAmount = parseFloat(movie.price) * quantityNum;

        // Format phone number
        const formattedPhone = formatPhoneNumber(phoneNumber);

        // Create a new ticket record with pending status
        const [ticketResult] = await pool.query(
            'INSERT INTO ticket (movieId, customerName, phoneNumber, quantity, totalAmount, paymentStatus) VALUES (?, ?, ?, ?, ?, ?)',
            [movieId, customerName, formattedPhone, quantityNum, totalAmount, 'Pending']
        );

        const ticketId = ticketResult.insertId;

        // Get access token for M-Pesa API
        const accessToken = await getMpesaAccessToken();

        if (!accessToken) {
            // Update ticket status to Failed
            await pool.query('UPDATE ticket SET paymentStatus = ? WHERE ticketId = ?', ['Failed', ticketId]);
            return res.status(500).json({ error: 'Failed to get M-Pesa access token' });
        }

        // Prepare STK push request
        const timestamp = new Date().toISOString().replace(/[^0-9]/g, '').slice(0, 14);
        const password = Buffer.from(
            `${mpesaConfig.businessShortCode}${mpesaConfig.passkey}${timestamp}`
        ).toString('base64');

        const stkPushUrl = `${mpesaConfig.baseUrl}/${mpesaConfig.stkPushUrl}`;

        const stkPushData = {
            BusinessShortCode: mpesaConfig.businessShortCode,
            Password: password,
            Timestamp: timestamp,
            TransactionType: 'CustomerBuyGoodsOnline',
            Amount: Math.ceil(totalAmount), // Amount must be an integer
            PartyA: formattedPhone,
            PartyB: mpesaConfig.tillNumber,
            PhoneNumber: formattedPhone,
            CallBackURL: mpesaConfig.callbackUrl,
            AccountReference: `Movie Ticket ${movie.title}`,
            TransactionDesc: 'Movie Ticket Purchase'
        };

        // Send STK push request
        const stkResponse = await axios({
            method: 'post',
            url: stkPushUrl,
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
            },
            data: stkPushData
        });

        // Check if STK push was successful
        if (stkResponse.data.ResponseCode === '0') {
            // Create PushRequest record
            const checkoutRequestId = stkResponse.data.CheckoutRequestID;
            await pool.query(
                'INSERT INTO pushrequest (ticketId, checkoutRequestId) VALUES (?, ?)',
                [ticketId, checkoutRequestId]
            );

            res.json({
                message: 'Payment initiated successfully',
                ticketId,
                checkoutRequestId,
                responseDescription: stkResponse.data.ResponseDescription || ''
            });
        } else {
            // Update ticket status to Failed
            await pool.query('UPDATE ticket SET paymentStatus = ? WHERE ticketId = ?', ['Failed', ticketId]);

            res.status(500).json({
                error: 'Failed to initiate payment',
                mpesaResponse: stkResponse.data
            });
        }
    } catch (error) {
        console.error('Error initiating payment:', error);
        res.status(500).json({ error: error.message });
    }
});

// Query payment status
app.post('/api/query-payment-status', async (req, res) => {
    try {
        const { checkoutRequestId } = req.body;

        if (!checkoutRequestId) {
            return res.status(400).json({ error: 'Checkout Request ID not provided' });
        }

        // Get access token for M-Pesa API
        const accessToken = await getMpesaAccessToken();

        if (!accessToken) {
            return res.status(500).json({ error: 'Failed to get M-Pesa access token' });
        }

        // Prepare STK query request
        const timestamp = new Date().toISOString().replace(/[^0-9]/g, '').slice(0, 14);
        const password = Buffer.from(
            `${mpesaConfig.businessShortCode}${mpesaConfig.passkey}${timestamp}`
        ).toString('base64');

        const queryUrl = `${mpesaConfig.baseUrl}/${mpesaConfig.stkQueryUrl}`;

        const queryData = {
            BusinessShortCode: mpesaConfig.businessShortCode,
            Password: password,
            Timestamp: timestamp,
            CheckoutRequestID: checkoutRequestId
        };

        // Send STK query request
        const queryResponse = await axios({
            method: 'post',
            url: queryUrl,
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
            },
            data: queryData
        });

        res.json(queryResponse.data);
    } catch (error) {
        console.error('Error querying payment status:', error);
        res.status(500).json({ error: error.message });
    }
});

// M-Pesa callback
app.post('/api/mpesa-callback', async (req, res) => {
    try {
        const { Body } = req.body;

        if (!Body || !Body.stkCallback) {
            return res.status(400).json({ error: 'Invalid callback data' });
        }

        const { ResultCode, CheckoutRequestID, CallbackMetadata } = Body.stkCallback;

        // Find the associated push request
        const [pushRequests] = await pool.query(
            'SELECT * FROM pushrequest WHERE checkoutRequestId = ?',
            [CheckoutRequestID]
        );

        if (pushRequests.length === 0) {
            return res.status(404).json({ error: 'No matching push request found' });
        }

        const pushRequest = pushRequests[0];

        // Get the associated ticket
        const [tickets] = await pool.query(
            'SELECT * FROM ticket WHERE ticketId = ?',
            [pushRequest.ticketId]
        );

        if (tickets.length === 0) {
            return res.status(404).json({ error: 'No matching ticket found' });
        }

        const ticket = tickets[0];

        // Process successful payment
        if (ResultCode === 0) {
            // Extract payment details
            const items = CallbackMetadata?.Item || [];

            const amount = items.find(item => item.Name === 'Amount')?.Value;
            const receiptNumber = items.find(item => item.Name === 'MpesaReceiptNumber')?.Value;
            const transactionDate = items.find(item => item.Name === 'TransactionDate')?.Value;

            // Format transaction date
            let formattedDate = null;
            if (transactionDate) {
                // Format from Safaricom is typically YYYYMMDDHHmmss
                const dateStr = transactionDate.toString();
                const year = dateStr.substring(0, 4);
                const month = dateStr.substring(4, 6);
                const day = dateStr.substring(6, 8);
                const hour = dateStr.substring(8, 10);
                const minute = dateStr.substring(10, 12);
                const second = dateStr.substring(12, 14);

                formattedDate = `${year}-${month}-${day} ${hour}:${minute}:${second}`;
            } else {
                formattedDate = new Date().toISOString().slice(0, 19).replace('T', ' ');
            }

            // Update ticket with payment details
            await pool.query(
                'UPDATE ticket SET paymentStatus = ?, mpesaReceiptNumber = ?, transactionDate = ? WHERE ticketId = ?',
                ['Paid', receiptNumber, formattedDate, ticket.ticketId]
            );

            res.json({ message: 'Payment completed successfully' });
        } else {
            // Update ticket status to Failed
            await pool.query(
                'UPDATE ticket SET paymentStatus = ? WHERE ticketId = ?',
                ['Failed', ticket.ticketId]
            );

            res.json({ message: 'Payment failed', result_code: ResultCode });
        }
    } catch (error) {
        console.error('Error processing M-Pesa callback:', error);
        res.status(500).json({ error: error.message });
    }
});

// Get ticket details
app.get('/api/tickets/:id', async (req, res) => {
    try {
        // Get the ticket with movie details
        const [tickets] = await pool.query(
            `SELECT t.*, m.title, m.description, m.showTime, m.price, m.max_tickets, m.imageUrl
       FROM ticket t
       JOIN movie m ON t.movieId = m.movieId
       WHERE t.ticketId = ?`,
            [req.params.id]
        );

        if (tickets.length === 0) {
            return res.status(404).json({ error: 'Ticket not found' });
        }

        const ticket = tickets[0];

        // Format the response
        const formattedTicket = {
            ticketId: ticket.ticketId,
            movieId: ticket.movieId,
            customerName: ticket.customerName,
            phoneNumber: ticket.phoneNumber,
            quantity: ticket.quantity,
            totalAmount: parseFloat(ticket.totalAmount),
            paymentStatus: ticket.paymentStatus,
            mpesaReceiptNumber: ticket.mpesaReceiptNumber,
            transactionDate: ticket.transactionDate,
            dateCreated: ticket.dateCreated,
            lastUpdated: ticket.lastUpdated,
            movie: {
                movieId: ticket.movieId,
                title: ticket.title,
                description: ticket.description,
                showTime: ticket.showTime,
                price: parseFloat(ticket.price),
                max_tickets: ticket.max_tickets,
                imageUrl: ticket.imageUrl
            }
        };

        res.json({ ticket: formattedTicket });
    } catch (error) {
        console.error('Error getting ticket:', error);
        res.status(500).json({ error: error.message });
    }
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Unhandled error:', err);
    res.status(500).json({ error: 'Internal server error' });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({ error: 'Route not found' });
});

// Initialize database and start the server
async function startServer() {
    try {
        await initializeDatabase();
        app.listen(PORT, () => {
            console.log(`Server running on port ${PORT}`);
        });
    } catch (error) {
        console.error('Failed to start server:', error);
        process.exit(1);
    }
}

startServer();

module.exports = app; // Export for testing
