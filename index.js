const express = require('express');
const Stripe = require('stripe');
const fs = require('fs').promises
const path = require('path')
const app = express();
const dotenv = require('dotenv');
dotenv.config({ path: './.env' });

const stripe = Stripe('sk_test_51Qf0ZGL1wtw2ceuLxdkSiXr5xwxUUHa9ptxalXiac43JqQDzhD67hORyMXUAZ7NbfUoYpgQcbsEX617Ls0jWufbc00JOvZkv0g'); // Replace with your Stripe secret key


const nodemailer = require('nodemailer');

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.set('view engine' , 'ejs');
app.set('views' , './views');

app.use(express.static('public'));




app.get('/', async (req, res) => {
    try {
        // Fetch products
        const products = await stripe.products.list( { limit: 4 , expand: ['data.default_price'], });

        // Fetch prices separately
        const prices = await stripe.prices.list();

        // Map prices to their corresponding products
        const productsWithPrices = products.data.map(product => {
            return {
                ...product,
                prices: prices.data.filter(price => price.product === product.id),
            };
        });

        // Render the products with their prices
        res.render('home', { products: productsWithPrices });
    } catch (error) {
        console.error('Error fetching products or prices:', error);
        res.status(500).send('Failed to fetch products');
    }
});

app.post('/create-checkout-session', express.json(), async (req, res) => {
    const { priceId } = req.body;
    if (!priceId) {
        return res.status(400).send('Price ID is required');
    }

    try {
        // Create a Checkout Session
        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'], 
            shipping_address_collection: {
                allowed_countries: ['US', 'CA'], // Specify allowed countries for shipping
            },
            shipping_options: [ // Add shipping rates
                {
                    shipping_rate_data: {
                        type: 'fixed_amount',
                        fixed_amount: { amount: 500, currency: 'usd' },
                        display_name: 'Standard shipping',
                        delivery_estimate: {
                            minimum: { unit: 'business_day', value: 5 },
                            maximum: { unit: 'business_day', value: 7 },
                        },
                    },
                },
                {
                    shipping_rate_data: {
                        type: 'fixed_amount',
                        fixed_amount: { amount: 1000, currency: 'usd' },
                        display_name: 'Express shipping',
                        delivery_estimate: {
                            minimum: { unit: 'business_day', value: 1 },
                            maximum: { unit: 'business_day', value: 3 },
                        },
                    },
                },
            ],
            line_items: [
                {
                    price: priceId,
                    quantity: 1,
                },
            ],
            mode: 'payment',
            success_url: `http://${process.env.DOMAIN}/success`,
            cancel_url: `http://${process.env.DOMAIN}/failure`,
        });
        

        res.json({ url: session.url });
    } catch (error) {
        console.error('Error creating checkout session:', error);
        res.status(500).send('Failed to create checkout session');
    }
});




app.get('/products', async (req, res) => {
    try {
        // Fetch products
        const products = await stripe.products.list({expand: ['data.default_price']});

        // Fetch prices separately
        const prices = await stripe.prices.list();

        // Map prices to their corresponding products
        const productsWithPrices = products.data.map(product => {
            return {
                ...product,
                prices: prices.data.filter(price => price.product === product.id),
            };
        });

        // Render the products with their prices
        res.render('products', { products: productsWithPrices });
    } catch (error) {
        console.error('Error fetching products or prices:', error);
        res.status(500).send('Failed to fetch products');
    }
});




app.get('/about', async ( req, res)=>{
    res.render('about');
})

app.get('/product/:id', async (req, res) => {
    const productId = req.params.id;

    try {
        // Retrieve the product details from Stripe
        // const product = await stripe.products.retrieve(productId);

        // Retrieve the price (assuming there’s one price for the product)
        const prices = await stripe.prices.list({ product: productId, limit: 1 });
        if (prices.data.length === 0) {
            return res.status(404).json({ error: 'No prices found for this product' });
        }

        const priceId = prices.data[0].id;

        // Create a Checkout Session
        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'], 
            shipping_address_collection: {
                allowed_countries: ['US', 'CA'], // Specify allowed countries for shipping
            },
            shipping_options: [ // Add shipping rates
                {
                    shipping_rate_data: {
                        type: 'fixed_amount',
                        fixed_amount: { amount: 500, currency: 'usd' },
                        display_name: 'Standard shipping',
                        delivery_estimate: {
                            minimum: { unit: 'business_day', value: 5 },
                            maximum: { unit: 'business_day', value: 7 },
                        },
                    },
                },
                {
                    shipping_rate_data: {
                        type: 'fixed_amount',
                        fixed_amount: { amount: 1000, currency: 'usd' },
                        display_name: 'Express shipping',
                        delivery_estimate: {
                            minimum: { unit: 'business_day', value: 1 },
                            maximum: { unit: 'business_day', value: 3 },
                        },
                    },
                },
            ],
            line_items: [
                {
                    price: priceId,
                    quantity: 1,
                },
            ],
            mode: 'payment',
            success_url: `http://${process.env.DOMAIN}/success`,
            cancel_url: `http://${process.env.DOMAIN}/failure`,
        });
        // Send the session URL to the client
        res.redirect(session.url)
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: error.message });
    }
});




let countdownStartTime = Math.floor(Date.now() / 1000); // Store the current time (seconds)

const middleware = async ( req, res , next) => {
    const fileContent  = await fs.readFile('offer-timer.txt','utf-8');
    const initial = Number(fileContent)
    if( initial > 0){
        req.initial = initial;
       return  next();
    }
    res.render('offer-delay');
}

app.get('/offer' , middleware ,( req ,res)=>{
    res.render('offer' , {consistentTime: countdownStartTime  , initialCountdownTime: req.initial});
})

app.get('/success',(_,res)=>{
    res.render('success')
})

app.get('/contact' , ( _ , res ) => {
    res.render('contact')
})
app.get('/blogs' , ( _ , res) => {
    res.render('blogs')
})
app.get('/blog1', ( _ , res ) => {
    res.render('blog-maint');
})

app.get('/blog2', ( _ , res ) => {
    res.render('blog2');
})
app.get('/blog3', ( _ , res ) => {
    res.render('blog3');
})





// Create a transporter for sending the email (using Gmail as an example)
const transporter = nodemailer.createTransport({
    service: 'gmail', // or your preferred email service
    auth: {
        user: 'info@baytclothing.com', // Replace with your email
        pass: 'pyklspsuwlwjhqar '   // Use your app-specific password or email password
    }
});

// Send Email Function
async function sendEmail(name , phoneNumber, email, message) {
    const mailOptions = {
        from: email, // Sender's email
        to: 'info@baytclothing.com', // Replace with the recipient email
        subject: `New Contact Us Message from ${name}`,
        html: `
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>New Contact Us Message</title>
                <style>
                    body {
                        font-family: Arial, sans-serif;
                        background-color: #f9f9f9;
                        margin: 0;
                        padding: 0;
                    }
                    .email-container {
                        width: 100%;
                        background-color: #ffffff;
                        padding: 20px;
                    }
                    .email-header {
                        background-color: #28a745;
                        color: #ffffff;
                        padding: 20px;
                        text-align: center;
                    }
                    .email-header h1 {
                        margin: 0;
                        font-size: 24px;
                    }
                    .email-body {
                        padding: 20px;
                    }
                    .email-body h2 {
                        color: #333;
                        font-size: 22px;
                        margin-bottom: 10px;
                    }
                    .email-body p {
                        font-size: 16px;
                        color: #555;
                        margin-bottom: 20px;
                    }
                    .email-body .details {
                        margin-bottom: 20px;
                    }
                    .email-body .details p {
                        margin: 8px 0;
                    }
                    .email-footer {
                        text-align: center;
                        font-size: 14px;
                        color: #777;
                        margin-top: 40px;
                    }
                    .email-footer a {
                        color: #28a745;
                        text-decoration: none;
                    }
                </style>
            </head>
            <body>
                <div class="email-container">
                    <div class="email-header">
                        <h1>New Contact Us Message</h1>
                    </div>
                    <div class="email-body">
                        <h2>You have received a new message from the contact form!</h2>
                        <div class="details">
                            <p><strong>Name:</strong> ${name}</p>
                            <p><strong>Email:</strong> ${email}</p>
                            <p><strong>Phone Number:</strong> ${phoneNumber}</p>
                            <p><strong>Message:</strong></p>
                            <p>${message}</p>
                        </div>
                        <p>We recommend you to respond as soon as possible to keep the customer engaged.</p>
                    </div>
                    <div class="email-footer">
                        <p>Thank you for your prompt attention.</p>
                        <p>Bayt Store | <a href="mailto:support@bayt.com">support@bayt.com</a></p>
                    </div>
                </div>
            </body>
            </html>
        `
    };

    try {
        await transporter.sendMail(mailOptions);
        console.log('Message sent successfully!');
    } catch (error) {
        console.error('Error sending email:', error);
    }
}


app.post('/send-message', async (req, res) => {
    const { name,  phoneNumber,  email, message } = req.body;

    // Send email using Nodemailer
    await sendEmail(name , phoneNumber, email, message);

    res.redirect('/succes-email'); // Redirect to a success page after submission
});


app.get('/succes-email' , ( _ , res) => {
    res.render('succes-email')
})
app.get('/failure' , (_ , res ) => {
    res.render('failure')
})

app.post('/subscribe', async (req, res) => {
    const email = req.body.email;

    if (!email) {
        return res.status(400).send('Email is required');
    }

    // Save the email to a file (or database)
    const filePath = path.join(__dirname, 'subscribers.txt');
    await fs.appendFile(filePath, email + '\n');

        console.log('Email saved:', email);

        // Send confirmation email
       await sendSubscriptionEmail(email);

       res.redirect('succes-email')
});

// Function to send confirmation email
async function sendSubscriptionEmail(email) {
    const transporter = nodemailer.createTransport({
        service: 'gmail', // Use Gmail's SMTP server
        auth: {
            user: 'info@baytclothing.com', // Replace with your email
            pass: 'pyklspsuwlwjhqar '  // Use app-specific password
        },
    });

    const mailOptions = {
        from: '"Bayt Offers" <info@baytclothing.com>', // Sender info
        to: email, // Recipient
        subject: 'Subscription Confirmation - Bayt Offers',
        html: `
            <h1>Welcome to Bayt Offers!</h1>
            <p>Thank you for subscribing to our exclusive offers. You will now receive the latest updates and discounts straight to your inbox.</p>
            <p>Stay tuned for great deals!</p>
            <br>
            <footer>
                <p>If you did not subscribe, please ignore this email.</p>
            </footer>
        `,
    };

    // Send the email
    return transporter.sendMail(mailOptions);
}




// Start the server
app.listen(3000, () => {
    console.log(`Server is running on ${process.env.DOMAIN}`);
});
