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
            success_url: `${process.env.DOMAIN}/success`,
            cancel_url: `${process.env.DOMAIN}/failure`,
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






let countdownStartTime = Math.floor(Date.now() / 1000); // Store the current time (seconds)

const middleware = async ( req, res , next) => {
    const fileContent  = await fs.readFile('offer-timer.txt','utf-8');
    const initial = Number(fileContent)
    if( initial > 0){
        req.initial = initial;
       return  next();
    }
   return res.render('offer-delay');
}

app.get('/offer' , middleware ,( req ,res)=>{
    res.render('offer' , {consistentTime: countdownStartTime  , initial: req.initial});
})
app.post('/reset-timer', async (req, res) => {
    try {
        // Reset the timer to 0 in the file
        await fs.writeFile('offer-timer.txt', '0');
        res.send('Timer reset');
    } catch (error) {
        console.error('Error updating timer file:', error);
        res.status(500).send('Server error');
    }
});



app.get('/product/:id' , async (req ,res)=>{

    const productId = req.params.id;
    const products = await stripe.products.list({expand: ['data.default_price'] , limit: 4});

    const product = await stripe.products.retrieve(productId);
    const prices = await stripe.prices.list({product: productId});
    
    res.render('singleproduct' , {products: products.data , product: product, prices: prices.data})
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
    // const transporter = nodemailer.createTransport({
    //     service: 'gmail', // Use Gmail's SMTP server
    //     auth: {
    //         user: 'info@baytclothing.com', // Replace with your email
    //         pass: 'pyklspsuwlwjhqar '  // Use app-specific password
    //     },
    // });

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



// Notify-Me Endpoint
app.post('/notify-me', async (req, res) => {
    try {
        const { userEmail, price, name, description, image } = req.body
        // Email HTML Content
        const emailHTML = `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <title>Product Back in Stock Notification</title>
                <style>
                    body { font-family: Arial, sans-serif; background-color: #f4f4f4; padding: 20px; }
                    .container { max-width: 600px; margin: auto; background: #fff; padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1); }
                    .header { text-align: center; font-size: 24px; font-weight: bold; color: #333; margin-bottom: 20px; }
                    .product-info { display: flex; align-items: center; gap: 20px; }
                    .product-img { width: 120px; height: 120px; object-fit: cover; border-radius: 6px; }
                    .details { flex-grow: 1; }
                    .title-price { display: flex; justify-content: space-between; align-items: center; }
                    .product-title { font-size: 20px; font-weight: bold; color: #444; }
                    .price { font-size: 18px; font-weight: bold; color: #28a745; }
                    .description { margin-top: 10px; font-size: 14px; color: #555; line-height: 1.6; }
                    .footer { margin-top: 20px; font-size: 12px; text-align: center; color: #888; }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">BaytClothing</div>
                    <p>I want to be notified about this product when it is in stock.</p>
                    
                    <!-- Product Section -->
                    <div class="product-info">
                        <img src="${image}" alt="Product Image" class="product-img">
                        <div class="details">
                            <div class="title-price">
                                <span class="product-title">${name}</span>
                                <span class="price">${price}</span>
                            </div>
                            <p class="description">${description}</p>
                        </div>
                    </div>

                    <div class="footer">
                        <p>Notification will be sent to: <strong>${userEmail}</strong></p>
                        <p>If you did not request this notification, please ignore this email.</p>
                    </div>
                </div>
            </body>
            </html>
        `;

        // Email Options
        const mailOptions = {
            from: userEmail,
            to: 'info@baytclothing.com',
            subject: 'I want to be notified about this product when it is in stock',
            html: emailHTML
        };

        // Send Email
        await transporter.sendMail(mailOptions);
        res.status(200).json({ message: 'Notification email sent successfully!' });

    } catch (error) {
        console.error('Error sending email:', error);
        res.status(500).json({ message: 'Failed to send email' });
    }
});










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

app.get('/faq' , (req, res)=>{
    res.render('faq' , {title: "FAQS"});
})

app.get('/shipping' , ( _  ,res)=>{
    res.render('faq' , {title: "SHIPPING"})
})
app.get('/returns' , ( req , res ) => {
    res.render('return-shipping' , {title: "RETURN AND SHIPPING"})
})

// Start the server
app.listen(3000, () => {
    console.log(`Server is running on ${process.env.DOMAIN}`);
});
