<img src="https://github.com/user-attachments/assets/8cc3904f-582e-4177-8205-e78ccea0500a" alt="Alt Text" width="180" height="180"></img>
# Movie Ticket System API Documentation (Express.js Version)

## Introduction

The Movie Ticket System is a comprehensive Node.js/Express.js backend application that enables users to browse movies, purchase tickets, and process payments via M-Pesa. This system provides a RESTful API that handles all aspects of movie ticket management and payment processing.

Built with modern JavaScript practices, this application offers a robust solution for movie theaters, event organizers, and similar businesses. The Express.js implementation provides excellent performance, scalability, and maintainability while maintaining all the functionality of the system.

Key features include:
- Movie management (add, retrieve)
- Ticket purchasing
- M-Pesa payment integration with STK Push
- Payment status tracking
- Ticket availability management

## Getting Started

### Prerequisites

- Node.js 14.x or higher
- npm or yarn
- MySQL 5.7 or higher
- M-Pesa developer account (for Safaricom API access)

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/barasamichael/mpesa_movie_system_javascript_express_js.git
   cd mpesa_movie_system_javascript_express_js
   ```

2. Install dependencies:
   ```bash
   npm install
   # or
   yarn install
   ```

3. Create a `.env` file based on the provided `.env.example`:
   ```bash
   cp .env.example .env
   ```

4. Update the `.env` file with your configuration:
   - Database credentials
   - M-Pesa API credentials
   - Server port settings

5. Start the application:
   ```bash
   # Development mode with auto-reload
   npm run dev
   
   # Production mode
   npm start
   ```

The server will start at `http://localhost:3000` (or your configured port).

## Database Schema

The system uses three main tables:

### Movie
- `movieId`: Primary key (auto-increment)
- `title`: Movie title (required)
- `description`: Movie description
- `showTime`: Date and time of the movie (required)
- `price`: Ticket price (required)
- `max_tickets`: Maximum number of available tickets (default: 100)
- `imageUrl`: URL to the movie poster image
- `dateCreated`: Record creation timestamp
- `lastUpdated`: Record last updated timestamp

### Ticket
- `ticketId`: Primary key (auto-increment)
- `movieId`: Foreign key to Movie (required)
- `customerName`: Name of the customer (required)
- `phoneNumber`: Customer phone number (required)
- `quantity`: Number of tickets purchased (required)
- `totalAmount`: Total amount paid (required)
- `paymentStatus`: Status of payment ('Pending', 'Paid', 'Failed')
- `mpesaReceiptNumber`: M-Pesa receipt number
- `transactionDate`: Date and time of the transaction
- `dateCreated`: Record creation timestamp
- `lastUpdated`: Record last updated timestamp

### PushRequest
- `pushRequestId`: Primary key (auto-increment)
- `ticketId`: Foreign key to Ticket (required)
- `checkoutRequestId`: M-Pesa checkout request ID (required)
- `dateCreated`: Record creation timestamp
- `lastUpdated`: Record last updated timestamp

## API Endpoints

### Root Endpoint
- **URL**: `/`
- **Method**: `GET`
- **Description**: Welcome message endpoint
- **Response**: `{"message": "Welcome to the Movie Ticket System API"}`

### Movie Management

#### Get All Movies
- **URL**: `/api/movies`
- **Method**: `GET`
- **Description**: Retrieve all movies
- **Response**: JSON object containing an array of movies
  ```json
  {
    "movies": [
      {
        "movieId": 1,
        "title": "The Matrix",
        "description": "A computer hacker learns about the true nature of reality",
        "showTime": "2025-06-15T18:30:00.000Z",
        "price": 500.0,
        "max_tickets": 200,
        "imageUrl": "https://example.com/matrix.jpg",
        "dateCreated": "2025-05-21T12:00:00.000Z",
        "lastUpdated": "2025-05-21T12:00:00.000Z"
      }
    ]
  }
  ```

#### Get Movie by ID
- **URL**: `/api/movies/:id`
- **Method**: `GET`
- **Description**: Retrieve a specific movie by ID
- **URL Parameters**: `id` - ID of the movie to retrieve
- **Response**: JSON object containing the movie details
  ```json
  {
    "movie": {
      "movieId": 1,
      "title": "The Matrix",
      "description": "A computer hacker learns about the true nature of reality",
      "showTime": "2025-06-15T18:30:00.000Z",
      "price": 500.0,
      "max_tickets": 200,
      "imageUrl": "https://example.com/matrix.jpg",
      "dateCreated": "2025-05-21T12:00:00.000Z",
      "lastUpdated": "2025-05-21T12:00:00.000Z"
    }
  }
  ```

#### Add New Movie
- **URL**: `/api/movies`
- **Method**: `POST`
- **Description**: Add a new movie
- **Request Body**:
  ```json
  {
    "title": "The Matrix Resurrections",
    "description": "The fourth installment in The Matrix franchise",
    "showTime": "2025-07-15T20:00:00.000Z",
    "price": 600,
    "max_tickets": 150,
    "imageUrl": "https://example.com/matrix4.jpg"
  }
  ```
- **Required Fields**: `title`, `showTime`, `price`
- **Response**: JSON object containing the added movie details
  ```json
  {
    "message": "Movie added successfully",
    "movie": {
      "movieId": 2,
      "title": "The Matrix Resurrections",
      "description": "The fourth installment in The Matrix franchise",
      "showTime": "2025-07-15T20:00:00.000Z",
      "price": 600.0,
      "max_tickets": 150,
      "imageUrl": "https://example.com/matrix4.jpg",
      "dateCreated": "2025-05-21T14:30:00.000Z",
      "lastUpdated": "2025-05-21T14:30:00.000Z"
    }
  }
  ```

### Ticket Management

#### Purchase Ticket (Get Available Movies)
- **URL**: `/api/purchase-ticket`
- **Method**: `GET`
- **Description**: Retrieve all movies for ticket purchase
- **Response**: Same as `GET /api/movies`

#### Make Payment (Initiate M-Pesa STK Push)
- **URL**: `/api/make-payment`
- **Method**: `POST`
- **Description**: Initiate an M-Pesa payment for ticket purchase
- **Request Body**:
  ```json
  {
    "movieId": 1,
    "customerName": "John Doe",
    "phoneNumber": "254712345678",
    "quantity": 2
  }
  ```
- **Required Fields**: `movieId`, `customerName`, `phoneNumber`, `quantity`
- **Response**: JSON object containing payment initiation details
  ```json
  {
    "message": "Payment initiated successfully",
    "ticketId": 1,
    "checkoutRequestId": "ws_CO_DMZ_12345678901234567",
    "responseDescription": "Success. Request accepted for processing"
  }
  ```

#### Query Payment Status
- **URL**: `/api/query-payment-status`
- **Method**: `POST`
- **Description**: Query the status of an M-Pesa STK push transaction
- **Request Body**:
  ```json
  {
    "checkoutRequestId": "ws_CO_DMZ_12345678901234567"
  }
  ```
- **Required Fields**: `checkoutRequestId`
- **Response**: JSON object containing the payment status
  ```json
  {
    "ResponseCode": "0",
    "ResponseDescription": "The service request has been accepted successfully",
    "MerchantRequestID": "12345-67890-1",
    "CheckoutRequestID": "ws_CO_DMZ_12345678901234567",
    "ResultCode": "0",
    "ResultDesc": "The service request is processed successfully"
  }
  ```

#### M-Pesa Callback
- **URL**: `/api/mpesa-callback`
- **Method**: `POST`
- **Description**: Callback endpoint for M-Pesa payment notifications
- **Notes**: 
  - This endpoint is called by Safaricom's M-Pesa API
  - Should be exposed via a publicly accessible URL
  - Updates ticket status based on payment result

#### Get Ticket Details
- **URL**: `/api/tickets/:id`
- **Method**: `GET`
- **Description**: Retrieve details of a specific ticket
- **URL Parameters**: `id` - ID of the ticket to retrieve
- **Response**: JSON object containing ticket details including movie information
  ```json
  {
    "ticket": {
      "ticketId": 1,
      "movieId": 1,
      "customerName": "John Doe",
      "phoneNumber": "254712345678",
      "quantity": 2,
      "totalAmount": 1000.0,
      "paymentStatus": "Paid",
      "mpesaReceiptNumber": "PBH234TYGD",
      "transactionDate": "2025-05-21T15:30:45.000Z",
      "dateCreated": "2025-05-21T15:25:10.000Z",
      "lastUpdated": "2025-05-21T15:30:50.000Z",
      "movie": {
        "movieId": 1,
        "title": "The Matrix",
        "description": "A computer hacker learns about the true nature of reality",
        "showTime": "2025-06-15T18:30:00.000Z",
        "price": 500.0,
        "max_tickets": 200,
        "imageUrl": "https://example.com/matrix.jpg"
      }
    }
  }
  ```

## Payment Flow

The system implements M-Pesa's STK Push functionality with the following flow:

1. **Ticket Creation**:
   - User selects a movie and provides details (name, phone number, ticket quantity)
   - System validates available tickets
   - System creates a ticket record with 'Pending' status

2. **Payment Initiation**:
   - System calculates the total amount based on movie price and ticket quantity
   - System formats the phone number for M-Pesa (2547XXXXXXXX format)
   - System obtains an OAuth access token from Safaricom
   - System sends an STK Push request to Safaricom's API

3. **STK Push Request**:
   - User receives a prompt on their phone to enter M-Pesa PIN
   - System creates a PushRequest record linking the Safaricom checkout request to the ticket
   - System returns a response to the client with payment initiation status

4. **Payment Processing**:
   - User enters PIN on their phone
   - Safaricom processes the payment
   - Safaricom sends a callback to the configured callback URL

5. **Payment Callback**:
   - System receives the callback with payment result
   - System locates the associated ticket using the checkout request ID
   - For successful payments:
     - System updates ticket status to 'Paid'
     - System records the M-Pesa receipt number and transaction date
   - For failed payments:
     - System updates ticket status to 'Failed'
   - System responds to Safaricom acknowledging receipt of callback

6. **Ticket Confirmation**:
   - Client can query the ticket status using the ticket ID
   - System provides ticket details with payment status

## Implementation Details

### Code Structure

The Express.js implementation follows a clean, modular structure:

1. **Server Initialization**:
   - Express app configuration
   - Middleware setup
   - Database connection pool creation
   - Environment variable loading

2. **Database Initialization**:
   - Creates tables if they don't exist
   - Adds sample data for development purposes

3. **Helper Functions**:
   - `formatPhoneNumber()`: Formats phone numbers for M-Pesa
   - `getMpesaAccessToken()`: Gets M-Pesa OAuth token

4. **API Routes**:
   - Well-organized route handlers for each endpoint
   - Proper error handling and validation
   - Async/await for clean asynchronous code

5. **Error Handling**:
   - Custom middleware for handling errors
   - 404 route for handling not found requests

### Security Considerations

The application implements several security best practices:

1. **Input Validation**: Validates all user inputs before processing
2. **Prepared Statements**: Uses parameterized queries to prevent SQL injection
3. **Environment Variables**: Stores sensitive configuration in environment variables
4. **Error Handling**: Provides minimal error details to clients to prevent information leakage
5. **HTTPS Support**: Designed to work over HTTPS for secure communication

### M-Pesa Integration

The application integrates with Safaricom's M-Pesa API through:

1. **OAuth Authentication**: Obtains access tokens for secure API access
2. **STK Push**: Initiates payment requests via the STK push method
3. **Transaction Query**: Queries transaction status via the STK query API
4. **Callback Handling**: Processes payment notifications via callbacks

## Extending the System

The Express.js implementation can be extended in several ways:

1. **User Authentication**:
   ```javascript
   // Add JWT or session-based authentication
   const jwt = require('jsonwebtoken');
   
   // Middleware for protected routes
   function authenticateToken(req, res, next) {
     const authHeader = req.headers['authorization'];
     const token = authHeader && authHeader.split(' ')[1];
     
     if (!token) return res.status(401).json({ error: 'Unauthorized' });
     
     jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, user) => {
       if (err) return res.status(403).json({ error: 'Forbidden' });
       req.user = user;
       next();
     });
   }
   
   // Apply to routes that need protection
   app.post('/api/movies', authenticateToken, async (req, res) => {
     // Only authenticated users can add movies
   });
   ```

2. **Admin Dashboard API**:
   ```javascript
   // Add admin-specific routes
   app.get('/api/admin/sales', authenticateToken, async (req, res) => {
     if (req.user.role !== 'admin') {
       return res.status(403).json({ error: 'Admin access required' });
     }
     
     // Get sales data
     // ...
   });
   ```

3. **Email Notifications**:
   ```javascript
   // Add Nodemailer for email notifications
   const nodemailer = require('nodemailer');
   
   // Send ticket confirmation email
   async function sendTicketConfirmation(ticket, movie) {
     // Configure transporter
     const transporter = nodemailer.createTransport({
       // SMTP configuration
     });
     
     await transporter.sendMail({
       from: 'tickets@example.com',
       to: ticket.email,
       subject: 'Your Movie Ticket',
       html: `<h1>Ticket Confirmation</h1>
              <p>Movie: ${movie.title}</p>
              <p>Date: ${movie.showTime}</p>
              <p>Quantity: ${ticket.quantity}</p>
              <p>Receipt: ${ticket.mpesaReceiptNumber}</p>`
     });
   }
   ```

## Performance Optimization

For high-traffic implementations, consider the following optimizations:

1. **Connection Pooling**: Already implemented using `mysql2/promise` pool
2. **Caching**: Implement Redis caching for frequently accessed data
   ```javascript
   const redis = require('redis');
   const client = redis.createClient();
   
   // Cache movie data
   app.get('/api/movies', async (req, res) => {
     client.get('all_movies', async (err, cachedMovies) => {
       if (cachedMovies) {
         return res.json({ movies: JSON.parse(cachedMovies) });
       }
       
       const [rows] = await pool.query('SELECT * FROM movie');
       client.setex('all_movies', 3600, JSON.stringify(rows)); // Cache for 1 hour
       res.json({ movies: rows });
     });
   });
   ```

3. **Request Rate Limiting**: Implement to prevent abuse
   ```javascript
   const rateLimit = require('express-rate-limit');
   
   const apiLimiter = rateLimit({
     windowMs: 15 * 60 * 1000, // 15 minutes
     max: 100, // 100 requests per windowMs
     message: { error: 'Too many requests, please try again later' }
   });
   
   app.use('/api/', apiLimiter);
   ```

## Deployment

For production deployment, consider the following:

1. **PM2 Process Manager**: For process management and auto-restart
   ```bash
   npm install -g pm2
   pm2 start index.js --name "movie-ticket-system"
   ```

2. **Nginx Reverse Proxy**: For better performance and SSL termination
   ```nginx
   server {
     listen 80;
     server_name api.example.com;
     
     location / {
         proxy_pass http://localhost:3000;
         proxy_http_version 1.1;
         proxy_set_header Upgrade $http_upgrade;
         proxy_set_header Connection 'upgrade';
         proxy_set_header Host $host;
         proxy_cache_bypass $http_upgrade;
     }
   }
   ```

3. **Docker Containerization**: For consistent environments
   ```dockerfile
   FROM node:14-alpine
   
   WORKDIR /usr/src/app
   
   COPY package*.json ./
   RUN npm install
   
   COPY . .
   
   EXPOSE 3000
   
   CMD ["node", "index.js"]
   ```

## Troubleshooting

### Common Issues

1. **Database Connection Errors**:
   - Check database credentials in `.env` file
   - Ensure MySQL server is running
   - Verify that the user has necessary permissions

2. **M-Pesa API Issues**:
   - Validate your Safaricom credentials
   - Check that your callback URL is publicly accessible
   - Ensure phone numbers are formatted correctly

3. **Server Startup Failures**:
   - Check for port conflicts
   - Verify environment variables are set correctly
   - Check log files for detailed error messages

### Debugging

For debugging issues:

1. Check logs:
   ```bash
   # If using PM2
   pm2 logs movie-ticket-system
   
   # Standard Node.js logs
   cat logs/app.log
   ```

2. Add debug logging:
   ```javascript
   // Add debug logging (development only)
   if (process.env.NODE_ENV === 'development') {
     app.use(require('morgan')('dev'));
   }
   ```

3. Use a tool like Postman to test API endpoints

## Conclusion

This Express.js implementation of the Movie Ticket System provides a robust, scalable backend for movie ticket sales with M-Pesa integration. The application follows modern Node.js practices, including promises, async/await, and structured error handling, making it both performant and maintainable.

By following this documentation, you can set up, customize, and extend the system to meet your specific requirements while maintaining the core functionality of movie management and M-Pesa payment processing.

For further assistance or to report issues, please contact Barasa Michael Murunga at jisortublow@gmail.com or open an issue on the GitHub repository.
