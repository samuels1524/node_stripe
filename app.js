require("dotenv").config();
const express = require("express");
const app = express();
const Stripe = require("stripe");
const stripe = Stripe(process.env.STRIPE_SECRET_KEY);
const cors = require("cors");
const PORT = process.env.PORT || 3000;

app.use("/stripe", express.raw({ type: "*/*" }));
app.use(express.json());
app.use(cors());

app.post("/buy", async (req, res) => {

  const { amount, idStripe } = req.body;

  try {
    const ephemeralKey = await stripe.ephemeralKeys.create(
      { customer: idStripe },
      { apiVersion: "2020-08-27" }
    );
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Number(amount),
      currency: "mxn",
      customer: idStripe,
      automatic_payment_methods: {
        enabled: true,
      },
    });
    res.status(200).json({
      paymentIntent: paymentIntent.client_secret,
      ephemeralKey: ephemeralKey.secret,
      customer: idStripe,
      publishableKey: process.env.STRIPE_PUBLICABLE_KEY,
    });
  } catch (err) {
    res.status(500).json({ message: "Internal Server Error ", error: err });
  }
});

app.post("/stripe", async (req, res) => {
  const sig = req.headers["stripe-signature"];
  let event;
  try {
    event = await stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.log(err);
    return res.status(400).json({ message: err.message });
  }
  if (event.type === "payment_intent.created") {
    console.log(`${event.data.object.metadata.coin} payment initated!`);
  }
  if (event.type === "payment_intent.succeeded") {
    console.log(`${event.data.object.metadata.coin} payment succeeded!`);
  }
  res.json({ ok: true });
});

app.post("/create-customer", async (req, res) => {
  try {
    const customer = await stripe.customers.create(req.body);
    res.status(200).json({
      message: "Cliente creado correctamente",
      info: customer,
    });
  } catch (error) {
    res.status(500).json({
      message: "Ocurrio un error",
      error,
    });
  }
});

app.post("/retrieve-customer", async (req, res) => {
  const { idCustomer } = req.body;
  try {
    const customer = await stripe.customers.retrieve(idCustomer);
    res.status(200).json({
      message: "Se recupero el cliente",
      info: customer,
    });
  } catch (error) {
    res.status(500).json({
      message: "Ocurrio un error",
      error,
    });
  }
});

app.post("/list-paymentMethods-user", async (req, res) => {
  const { idCustomer } = req.body;
  try {
    const paymentMethods = await stripe.customers.listPaymentMethods(
      idCustomer,
      { type: "card" }
    );
    res.status(200).json({
      message: "Se recuperaron los metodos de pago",
      info: paymentMethods,
    });
  } catch (error) {
    res.status(500).json({
      message: "ocurrio un error",
      error,
    });
  }
});

app.post("/update-customer", async (req, res) => {
  const { idCustomer, data } = req.body;
  try {
    const customer = await stripe.customers.update(idCustomer, data);
    res.status(200).json({
      message: "Se actualizo el cliente",
      info: customer,
    });
  } catch (error) {
    res.status(500).json({
      message: "Ocurrio un error",
      error,
    });
  }
});

app.post("/delete-customer", async (req, res) => {
  const { idCustomer } = req.body;
  try {
    const customer = await stripe.customers.del(idCustomer);
    res.status(200).json({
      message: "Se elimino el cliente",
      info: customer,
    });
  } catch (error) {
    res.status(500).json({
      message: "Ocurrio un error",
      error,
    });
  }
});

app.post("/create-paymentMethod", async (req, res) => {
  try {
    const paymentMethod = await stripe.paymentMethods.create(req.body);
    res.status(200).json({
      message: "Se agrego el metodo de pago",
      info: paymentMethod,
    });
  } catch (error) {
    res.status(500).json({
      message: "ocurrio un error",
      error,
    });
  }
});

app.post("/add-paymentMethod-user", async (req, res) => {
  const { idPaymentMethod, idCustomer } = req.body;
  try {
    const paymentMethod = await stripe.paymentMethods.attach(idPaymentMethod, {
      customer: idCustomer,
    });
    res.status(200).json({
      message: "Se agrego el metodo de pago al usuario",
      info: paymentMethod,
    });
  } catch (error) {
    res.status(500).json({
      message: "ocurrio un error",
      error,
    });
  }
});

app.post("/delete-paymentMethod", async (req, res) => {
  const { idPaymentMethod } = req.body;
  try {
    const paymentMethod = await stripe.paymentMethods.detach(idPaymentMethod);
    res.status(200).json({
      message: "Se elimino el metodo de pago",
      info: paymentMethod,
    });
  } catch (error) {
    res.status(500).json({
      message: "ocurrio un error",
      error,
    });
  }
});

app.post("/payment-sheet", async (req, res) => {
  const { idCustomer } = req.body;
  const customer = await stripe.customers.retrieve(idCustomer);
  if (!customer) {
    return res.status(500).json({
      message: `No existe un cliente con el id ${idCustomer}`,
      error,
    });
  }
  const ephemeralKey = await stripe.ephemeralKeys.create(
    { customer: idCustomer },
    { apiVersion: "2020-08-27" }
  );
  const setupIntent = await stripe.setupIntents.create({
    customer: idCustomer,
  });
  res.status(200).json({
    publishableKey: process.env.STRIPE_PUBLICABLE_KEY,
    setupIntent: setupIntent.client_secret,
    ephemeralKey: ephemeralKey.secret,
    customer: idCustomer,
  });
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
