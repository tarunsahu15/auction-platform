import mongoose from "mongoose";
import { catchAsyncErrors } from "../middlewares/catchAsyncErrors.js";
import ErrorHandler from "../middlewares/error.js";
import { Auction } from "../models/auctionSchema.js";
import { Bid } from "../models/bidSchema.js";
import { User } from "../models/userSchema.js";

export const placeBid = catchAsyncErrors(async (req, res, next) => {
  const { id } = req.params;
  const auctionItem = await Auction.findById(id);
  if (!auctionItem) {
    return next(new ErrorHandler("Auction Item not found.", 404));
  }
  const { amount } = req.body;
  if (!amount) {
    return next(new ErrorHandler("Please place your bid.", 404));
  }
  if (amount <= auctionItem.currentBid) {
    return next(
      new ErrorHandler("Bid amount must be greater than the current bid.", 404)
    );
  }
  if (amount < auctionItem.startingBid) {
    return next(
      new ErrorHandler("Bid amount must be greater than starting bid.", 404)
    );
  }

  const session = await mongoose.startSession();
  try {
    await session.withTransaction(async () => {
      // 1) re-fetch the auction inside the transaction
      const auction = await Auction.findById(id)
        .session(session)
        .exec();
      if (!auction) {
        throw new ErrorHandler("Auction Item not found.", 404);
      }

      // 2) see if this user already has a Bid document
      const existingBid = await Bid.findOne({
        "bidder.id": req.user._id,
        auctionItem: auction._id,
      })
        .session(session)
        .exec();

      // 3) see if there's already an entry in auction.bids subarray
      const existingBidInAuction = auction.bids.find(
        (b) => b.userId.toString() === req.user._id.toString()
      );

      if (existingBid && existingBidInAuction) {
        // update both the separate Bid doc and the subdocument in Auction
        existingBidInAuction.amount = amount;
        existingBid.amount = amount;

        await existingBid.save({ session });
        // saving auction will persist subdoc change
        await auction.save({ session });
      } else {
        // 4) create a new Bid
        const bidderDetail = await User.findById(req.user._id)
          .session(session)
          .exec();
        if (!bidderDetail) {
          throw new ErrorHandler("User not found.", 500);
        }

        const bid = new Bid({
          amount,
          bidder: {
            id: bidderDetail._id,
            userName: bidderDetail.userName,
            profileImage: bidderDetail.profileImage?.url,
          },
          auctionItem: auction._id,
        });
        await bid.save({ session });

        // 5) push into auction.bids subarray
        auction.bids.push({
          userId: req.user._id,
          userName: bidderDetail.userName,
          profileImage: bidderDetail.profileImage?.url,
          amount,
        });
        await auction.save({ session });
      }

      // 6) update the auction’s currentBid
      auction.currentBid = amount;
      await auction.save({ session });
    }); // end transaction

    // on success, send back updated currentBid
    // we can trust auctionItem.currentBid was updated
    return res.status(201).json({
      success: true,
      message: "Bid placed.",
      currentBid: amount,
    });
  } catch (err) {
    if (err instanceof ErrorHandler) {
      return next(err);
    }
    return next(
      new ErrorHandler(err.message || "Failed to place bid.", 500)
    );
  } finally {
    session.endSession();
  }
});

// import { catchAsyncErrors } from "../middlewares/catchAsyncErrors.js";
// import ErrorHandler from "../middlewares/error.js";
// import { Auction } from "../models/auctionSchema.js";
// import { Bid } from "../models/bidSchema.js";
// import { User } from "../models/userSchema.js";

// export const placeBid = catchAsyncErrors(async (req, res, next) => {
//   const { id } = req.params;
//   const auctionItem = await Auction.findById(id);
//   if (!auctionItem) {
//     return next(new ErrorHandler("Auction Item not found.", 404));
//   }
//   const { amount } = req.body;
//   if (!amount) {
//     return next(new ErrorHandler("Please place your bid.", 404));
//   }
//   if (amount <= auctionItem.currentBid) {
//     return next(
//       new ErrorHandler("Bid amount must be greater than the current bid.", 404)
//     );
//   }
//   if (amount < auctionItem.startingBid) {
//     return next(
//       new ErrorHandler("Bid amount must be greater than starting bid.", 404)
//     );
//   }

//   try {
//     const existingBid = await Bid.findOne({
//       "bidder.id": req.user._id,
//       auctionItem: auctionItem._id,
//     });
//     const existingBidInAuction = auctionItem.bids.find(
//       (bid) => bid.userId.toString() == req.user._id.toString()
//     );
//     if (existingBid && existingBidInAuction) {
//       existingBidInAuction.amount = amount;
//       existingBid.amount = amount;
//       await existingBidInAuction.save();
//       await existingBid.save();
//       auctionItem.currentBid = amount;
//     } else {
//       const bidderDetail = await User.findById(req.user._id);
//       const bid = await Bid.create({
//         amount,
//         bidder: {
//           id: bidderDetail._id,
//           userName: bidderDetail.userName,
//           profileImage: bidderDetail.profileImage?.url,
//         },
//         auctionItem: auctionItem._id,
//       });
//       auctionItem.bids.push({
//         userId: req.user._id,
//         userName: bidderDetail.userName,
//         profileImage: bidderDetail.profileImage?.url,
//         amount,
//       });
//       auctionItem.currentBid = amount;
      
//     }
//     await auctionItem.save();

//     res.status(201).json({
//       success: true,
//       message: "Bid placed.",
//       currentBid: auctionItem.currentBid,
//     });
//   } catch (error) {
//     return next(new ErrorHandler(error.message || "Failed to place bid.", 500));
//   }
// }); 
// tarun 62 wants to make some changes into this
