import express from "express"
import Book from "../models/Book.js"
import BookTransaction from "../models/BookTransaction.js"

const router = express.Router()

router.post("/add-transaction", async (req, res) => {
    try {
        if (req.body.isAdmin === true) {
            const newtransaction = await new BookTransaction({
                bookId: req.body.bookId,
                borrowerId: req.body.borrowerId,
                bookName: req.body.bookName,
                borrowerName: req.body.borrowerName,
                borrowerAdmissionNo: req.body.borrowerAdmissionNo,
                transactionType: req.body.transactionType,
                fromDate: req.body.fromDate,
                toDate: req.body.toDate
            })
            const transaction = await newtransaction.save()
            const book = Book.findById(req.body.bookId)
            await book.updateOne({ $push: { transactions: transaction._id } })
            res.status(200).json(transaction)
        }
        else if (req.body.isAdmin === false) {
            res.status(500).json("You are not allowed to add a Transaction")
        }
    }
    catch (err) {
        res.status(504).json(err)
    }
})



router.get("/all-transactions", async (req, res) => {
    try {

        // console.log("Fetching all transactions");
        const transactions = await BookTransaction.find({}).sort({ _id: -1 })
        res.status(200).json(transactions)
    }
    catch (err) {
        return res.status(504).json(err)
    }
})

router.get("/allActive-transactions", async (req, res) => {
    try {

        console.log("Fetching all active transactions");
        const transactions = await BookTransaction.find({ status: "Active" }).sort({ _id: -1 })
        res.status(200).json(transactions)
    }
    catch (err) {
        return res.status(504).json(err)
    }
})

router.get("/allArchived-transactions", async (req, res) => {
    try {

        console.log("Fetching all archived transactions");
        const transactions = await BookTransaction.find({ status: "Completed" }).sort({ _id: -1 })
        res.status(200).json(transactions)
    }
    catch (err) {
        return res.status(504).json(err)
    }
})

router.put("/update-transaction/:id", async (req, res) => {
    try {
        console.log("is admin===<",req.body.isAdmin)
        console.log("req.params.id===<",req.params.id)
        if (req.body.isAdmin) {
            // Find the transaction to get the bookId
            const transaction = await BookTransaction.findById(req.params.id);
            if (!transaction) {
                return res.status(404).json("Transaction not found");
            }

            // Update the transaction details
            await BookTransaction.findByIdAndUpdate(req.params.id, {
                $set: req.body,
            });

            // Update the book's available count (increment by 1)
            // await Book.findByIdAndUpdate(transaction.bookId, {
            //     $inc: { bookCountAvailable: 1 },
            // });

            res.status(200).json("Transaction details updated successfully and book count incremented");
        } else {
            res.status(403).json("You don't have permission to update this transaction");
        }
    } catch (err) {
        res.status(504).json(err);
    }
})

router.delete("/remove-transaction/:id", async (req, res) => {
    if (req.body.isAdmin) {
        try {
            const data = await BookTransaction.findByIdAndDelete(req.params.id);
            const book = Book.findById(data.bookId)
            console.log(book)
            await book.updateOne({ $pull: { transactions: req.params.id } })
            res.status(200).json("Transaction deleted successfully");
        } catch (err) {
            return res.status(504).json(err);
        }
    } else {
        return res.status(403).json("You dont have permission to delete a book!");
    }
})

export default router