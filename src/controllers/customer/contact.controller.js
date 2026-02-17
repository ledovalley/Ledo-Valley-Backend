import ContactInquiry from "../../models/ContactInquiry.js";

export const createInquiry = async (req, res) => {
    try {
        const {
            fullName,
            companyName,
            email,
            phone,
            subject,
            message,
        } = req.body;

        if (!fullName || !email || !subject || !message) {
            return res.status(400).json({
                message: "Required fields missing",
            });
        }

        const inquiry = await ContactInquiry.create({
            fullName,
            companyName,
            email,
            phone,
            subject,
            message,
        });

        res.status(201).json({
            message: "Inquiry submitted successfully",
            inquiryId: inquiry._id,
        });

    } catch (error) {
        console.error("CREATE INQUIRY ERROR:", error);
        res.status(500).json({
            message: "Failed to submit inquiry",
        });
    }
};
