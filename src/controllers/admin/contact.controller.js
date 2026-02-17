import ContactInquiry from "../../models/ContactInquiry.js";

/* =========================================
   LIST ALL INQUIRIES
========================================= */
export const listInquiries = async (req, res) => {
    try {
        const {
            page = 1,
            limit = 20,
            status,
            search,
        } = req.query;

        const query = {};

        if (status) query.status = status;

        if (search) {
            query.$or = [
                { fullName: { $regex: search, $options: "i" } },
                { email: { $regex: search, $options: "i" } },
                { subject: { $regex: search, $options: "i" } },
            ];
        }

        const skip = (Number(page) - 1) * Number(limit);

        const [inquiries, total] = await Promise.all([
            ContactInquiry.find(query)
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(Number(limit))
                .lean(),

            ContactInquiry.countDocuments(query),
        ]);

        res.json({
            inquiries,
            total,
            page: Number(page),
            pages: Math.ceil(total / Number(limit)),
        });

    } catch (error) {
        console.error("LIST INQUIRIES ERROR:", error);
        res.status(500).json({
            message: "Failed to fetch inquiries",
        });
    }
};

/* =========================================
   UPDATE STATUS
========================================= */
export const updateInquiryStatus = async (req, res) => {
    try {
        const { inquiryId } = req.params;
        const { status, adminNote } = req.body;

        const allowed = ["PENDING", "IN_PROGRESS", "RESPONDED", "CLOSED"];

        if (!allowed.includes(status)) {
            return res.status(400).json({
                message: "Invalid status",
            });
        }

        const inquiry = await ContactInquiry.findById(inquiryId);

        if (!inquiry) {
            return res.status(404).json({
                message: "Inquiry not found",
            });
        }

        inquiry.status = status;

        if (adminNote) {
            inquiry.adminNote = adminNote;
        }

        if (status === "RESPONDED") {
            inquiry.respondedAt = new Date();
        }

        await inquiry.save();

        res.json({
            message: "Inquiry updated",
            inquiry,
        });

    } catch (error) {
        console.error("UPDATE INQUIRY ERROR:", error);
        res.status(500).json({
            message: "Failed to update inquiry",
        });
    }
};
