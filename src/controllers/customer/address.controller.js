import Customer from "../../models/Customer.js";

/* ======================================================
   HELPERS
====================================================== */

const validateAddressFields = ({
  name,
  phone,
  addressLine1,
  city,
  state,
  pincode,
}) => {
  if (!name || !phone || !addressLine1 || !city || !state || !pincode) {
    return "Missing required fields";
  }

  if (phone.length < 10) return "Invalid phone number";

  if (!/^[0-9]{6}$/.test(pincode)) {
    return "Invalid pincode";
  }

  return null;
};

/* ======================================================
   GET ALL ADDRESSES
====================================================== */

export const getAddresses = async (req, res) => {
  const customer = await Customer.findById(req.customer.id).select("addresses");

  if (!customer)
    return res.status(404).json({ message: "Customer not found" });

  res.json(customer.addresses);
};

/* ======================================================
   ADD ADDRESS
====================================================== */

export const addAddress = async (req, res) => {
  const {
    name,
    phone,
    addressLine1,
    addressLine2,
    city,
    state,
    pincode,
    isDefault,
  } = req.body;

  const error = validateAddressFields(req.body);
  if (error) return res.status(400).json({ message: error });

  const customer = await Customer.findById(req.customer.id);
  if (!customer)
    return res.status(404).json({ message: "Customer not found" });

  // If first address → force default
  const shouldBeDefault =
    customer.addresses.length === 0 || isDefault;

  if (shouldBeDefault) {
    customer.addresses.forEach((addr) => {
      addr.isDefault = false;
    });
  }

  customer.addresses.push({
    name: name.trim(),
    phone: phone.trim(),
    addressLine1: addressLine1.trim(),
    addressLine2: addressLine2?.trim() || "",
    city: city.trim(),
    state: state.trim(),
    pincode: pincode.trim(),
    isDefault: shouldBeDefault,
  });

  await customer.save();

  res.status(201).json(customer.addresses);
};

/* ======================================================
   UPDATE ADDRESS
====================================================== */

export const updateAddress = async (req, res) => {
  const { addressId } = req.params;

  const customer = await Customer.findById(req.customer.id);
  if (!customer)
    return res.status(404).json({ message: "Customer not found" });

  const address = customer.addresses.id(addressId);

  if (!address)
    return res.status(404).json({ message: "Address not found" });

  // Validate required fields if updating them
  const error = validateAddressFields({
    ...address.toObject(),
    ...req.body,
  });

  if (error) return res.status(400).json({ message: error });

  Object.assign(address, {
    name: req.body.name?.trim() ?? address.name,
    phone: req.body.phone?.trim() ?? address.phone,
    addressLine1:
      req.body.addressLine1?.trim() ?? address.addressLine1,
    addressLine2:
      req.body.addressLine2?.trim() ?? address.addressLine2,
    city: req.body.city?.trim() ?? address.city,
    state: req.body.state?.trim() ?? address.state,
    pincode: req.body.pincode?.trim() ?? address.pincode,
  });

  if (req.body.isDefault) {
    customer.addresses.forEach((addr) => {
      addr.isDefault = false;
    });
    address.isDefault = true;
  }

  await customer.save();

  res.json(customer.addresses);
};

/* ======================================================
   DELETE ADDRESS
====================================================== */

export const deleteAddress = async (req, res) => {
  const { addressId } = req.params;

  const customer = await Customer.findById(req.customer.id);
  if (!customer)
    return res.status(404).json({ message: "Customer not found" });

  const address = customer.addresses.id(addressId);

  if (!address)
    return res.status(404).json({ message: "Address not found" });

  const wasDefault = address.isDefault;

  address.deleteOne();

  // If deleted address was default → assign another as default
  if (wasDefault && customer.addresses.length > 0) {
    customer.addresses[0].isDefault = true;
  }

  await customer.save();

  res.json(customer.addresses);
};

/* ======================================================
   SET DEFAULT ADDRESS
====================================================== */

export const setDefaultAddress = async (req, res) => {
  const { addressId } = req.params;

  const customer = await Customer.findById(req.customer.id);
  if (!customer)
    return res.status(404).json({ message: "Customer not found" });

  let found = false;

  customer.addresses.forEach((addr) => {
    if (addr._id.toString() === addressId) {
      addr.isDefault = true;
      found = true;
    } else {
      addr.isDefault = false;
    }
  });

  if (!found)
    return res.status(404).json({ message: "Address not found" });

  await customer.save();

  res.json(customer.addresses);
};
