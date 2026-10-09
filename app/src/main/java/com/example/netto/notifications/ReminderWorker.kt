package com.example.netto.notifications

import android.Manifest
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.os.Build
import androidx.core.app.ActivityCompat
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import androidx.hilt.work.HiltWorker
import androidx.work.CoroutineWorker
import androidx.work.WorkerParameters
import com.example.netto.MainActivity
import com.example.netto.R
import com.example.netto.data.auth.SessionManager
import com.example.netto.data.repository.BudgetPlanRepository
import com.example.netto.data.repository.ObligationRepository
import com.example.netto.domain.model.ObligationStatus
import com.example.netto.util.formatMoney
import dagger.assisted.Assisted
import dagger.assisted.AssistedInject
import kotlinx.coroutines.flow.first
import java.time.LocalDate

/** Revisa diariamente las obligaciones pendientes y notifica las vencidas o próximas a vencer. */
@HiltWorker
class ReminderWorker @AssistedInject constructor(
    @Assisted context: Context,
    @Assisted params: WorkerParameters,
    private val obligationRepository: ObligationRepository,
    private val budgetPlanRepository: BudgetPlanRepository,
    private val session: SessionManager,
) : CoroutineWorker(context, params) {

    override suspend fun doWork(): Result {
        val hasPermission = Build.VERSION.SDK_INT < Build.VERSION_CODES.TIRAMISU ||
            ActivityCompat.checkSelfPermission(
                applicationContext,
                Manifest.permission.POST_NOTIFICATIONS
            ) == PackageManager.PERMISSION_GRANTED
        if (!hasPermission) return Result.success()
        // Solo se avisa de los vencimientos del usuario con la sesión abierta.
        if (session.currentUserId() == null) return Result.success()

        val today = LocalDate.now()
        val reminderDays = budgetPlanRepository.get().reminderDaysBefore.toLong()
        val obligations = obligationRepository.observeAll().first()

        val toNotify = obligations.filter { !it.isPaid }
            .filter { obligation ->
                val status = ObligationStatus.from(obligation.dueDate, false, today, reminderDays)
                status == ObligationStatus.VENCIDO || status == ObligationStatus.HOY || status == ObligationStatus.PROXIMO
            }

        if (toNotify.isEmpty()) return Result.success()

        val manager = NotificationManagerCompat.from(applicationContext)
        val openAppIntent = Intent(applicationContext, MainActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK
        }
        val pendingIntent = PendingIntent.getActivity(
            applicationContext, 0, openAppIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        toNotify.forEach { obligation ->
            val status = ObligationStatus.from(obligation.dueDate, false, today, reminderDays)
            val title = when (status) {
                ObligationStatus.VENCIDO -> "${obligation.name} está vencido"
                ObligationStatus.HOY -> "${obligation.name} vence hoy"
                else -> "${obligation.name} vence pronto"
            }
            val notification = NotificationCompat.Builder(applicationContext, ReminderScheduler.CHANNEL_ID)
                .setSmallIcon(R.drawable.ic_launcher_foreground)
                .setContentTitle(title)
                .setContentText("${obligation.amount.formatMoney(obligation.currency)} · vence el ${obligation.dueDate}")
                .setPriority(NotificationCompat.PRIORITY_HIGH)
                .setAutoCancel(true)
                .setContentIntent(pendingIntent)
                .build()
            manager.notify(obligation.id.toInt(), notification)
        }
        return Result.success()
    }
}
