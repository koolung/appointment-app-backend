-- CreateTable
CREATE TABLE "Settings" (
    "id" TEXT NOT NULL PRIMARY KEY DEFAULT 'singleton',
    "salonName" TEXT NOT NULL DEFAULT 'My Salon',
    "email" TEXT NOT NULL DEFAULT '',
    "phone" TEXT NOT NULL DEFAULT '',
    "address" TEXT NOT NULL DEFAULT '',
    "openingTime" TEXT NOT NULL DEFAULT '09:00',
    "closingTime" TEXT NOT NULL DEFAULT '18:00',
    "bookingNotifications" BOOLEAN NOT NULL DEFAULT true,
    "appointmentReminders" BOOLEAN NOT NULL DEFAULT true,
    "minCancellationHours" INTEGER NOT NULL DEFAULT 24,
    "bookingWarningMessage" TEXT NOT NULL DEFAULT 'Please note: Appointments cancelled less than 24 hours before the scheduled time may incur a cancellation fee.',
    "updatedAt" DATETIME NOT NULL
);
