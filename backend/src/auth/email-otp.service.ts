import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { RedisService } from '../common/redis.service';
import { UserRole } from '../users/user.entity';

@Injectable()
export class EmailOtpService {
  private readonly logger = new Logger(EmailOtpService.name);
  private transporter: nodemailer.Transporter;

  constructor(
    private configService: ConfigService,
    private redisService: RedisService,
  ) {
    this.transporter = nodemailer.createTransport({
      host: this.configService.get<string>('SMTP_HOST'),
      port: Number(this.configService.get<string>('SMTP_PORT') || 587),
      secure: this.configService.get<string>('SMTP_SECURE') === 'true',
      auth: {
        user: this.configService.get<string>('SMTP_USER'),
        pass: this.configService.get<string>('SMTP_PASS'),
      },
    });
    this.logger.log('Nodemailer email OTP service initialized');
  }

  private generateCode(): string {
    return String(Math.floor(1000 + Math.random() * 9000));
  }

  async sendOtp(email: string): Promise<{ success: boolean }> {
    const code = this.generateCode();
    // Use Redis for OTP storage, expires in 600s (10 minutes)
    await this.redisService.set(`otp:${email.toLowerCase()}`, code, 600);

    const from = this.configService.get<string>('SMTP_FROM') || 'no-reply@edriveapp.com';

    try {
      await this.transporter.sendMail({
        from: `"edrive" <${from}>`,
        to: email,
        subject: 'Your edrive verification code',
        html: this.buildOtpEmail(code),
        text: `Your edrive verification code is: ${code}\n\nThis code expires in 10 minutes. Do not share it with anyone.`,
      });

      this.logger.log(`OTP sent to ${email}`);
      return { success: true };
    } catch (error: any) {
      this.logger.error(`Failed to send OTP to ${email}: ${error.message}`);
      throw error;
    }
  }

  async verifyOtp(email: string, code: string): Promise<boolean> {
    const storedCode = await this.redisService.get(`otp:${email.toLowerCase()}`);
    if (!storedCode) return false;
    
    if (storedCode.trim() !== code.trim()) return false;
    
    // Clear correctly on success (We cheat here by setting TTL to 1s or overwriting since RedisService doesn't expose DELETE directly)
    await this.redisService.set(`otp:${email.toLowerCase()}`, '', 1); 
    return true;
  }

  async sendWelcomeEmail(payload: {
    email: string;
    firstName?: string | null;
    role?: UserRole | string | null;
  }): Promise<{ success: boolean }> {
    const email = payload.email?.trim().toLowerCase();
    if (!email) return { success: false };

    const role = payload.role === UserRole.DRIVER ? UserRole.DRIVER : UserRole.PASSENGER;
    const firstName = (payload.firstName || '').trim() || 'there';
    const from = this.configService.get<string>('SMTP_FROM') || 'no-reply@edriveapp.com';

    const subject =
      role === UserRole.DRIVER
        ? 'Welcome to edrive, let us get you verified'
        : 'Welcome to edrive';

    const html =
      role === UserRole.DRIVER
        ? this.buildDriverWelcomeEmail(firstName)
        : this.buildPassengerWelcomeEmail(firstName);

    const text =
      role === UserRole.DRIVER
        ? `Welcome to edrive, ${firstName}.\n\nWe are glad to have you here. To start driving, complete your profile, upload your vehicle and license details, and submit your account for verification in the app. Our team will review it as quickly as possible.\n\nThank you for joining edrive.`
        : `Welcome to edrive, ${firstName}.\n\nWe are happy you are here. Your next comfortable ride is only a few taps away. Open the app anytime to request a ride, track your trip, and move with confidence.\n\nThank you for choosing edrive.`;

    try {
      await this.transporter.sendMail({
        from: `"edrive" <${from}>`,
        to: email,
        subject,
        html,
        text,
      });

      this.logger.log(`Welcome email sent to ${email} as ${role}`);
      return { success: true };
    } catch (error: any) {
      this.logger.error(`Failed to send welcome email to ${email}: ${error.message}`);
      return { success: false };
    }
  }

  private buildOtpEmail(code: string): string {
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
</head>
<body style="margin:0;padding:0;background:#f4f4f4;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f4;padding:40px 0;">
    <tr>
      <td align="center">
        <table width="480" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.08);">
          <!-- Header -->
          <tr>
            <td style="background:#005124;padding:32px 40px;text-align:center;">
              <p style="margin:0;font-size:26px;font-weight:700;color:#ffffff;letter-spacing:-0.5px;">edrive</p>
              <p style="margin:6px 0 0;font-size:13px;color:#a3d4b5;">Travel Smarter, Travel Together</p>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding:40px;">
              <p style="margin:0 0 8px;font-size:22px;font-weight:700;color:#111;">Your verification code</p>
              <p style="margin:0 0 32px;font-size:15px;color:#666;line-height:1.6;">
                Use the code below to verify your account. It expires in <strong>10 minutes</strong>.
              </p>
              <!-- OTP box -->
              <div style="background:#f0f9f4;border:2px dashed #005124;border-radius:12px;padding:28px;text-align:center;margin-bottom:32px;">
                <p style="margin:0;font-size:48px;font-weight:800;letter-spacing:16px;color:#005124;">${code}</p>
              </div>
              <p style="margin:0;font-size:13px;color:#999;line-height:1.6;">
                If you didn't request this code, you can safely ignore this email. Never share this code with anyone — edrive will never ask for it.
              </p>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="background:#f9f9f9;padding:20px 40px;border-top:1px solid #eee;text-align:center;">
              <p style="margin:0;font-size:12px;color:#aaa;">&copy; ${new Date().getFullYear()} edrive. All rights reserved.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
  }

  private buildPassengerWelcomeEmail(firstName: string): string {
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
</head>
<body style="margin:0;padding:0;background:#f4f4f4;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f4;padding:40px 0;">
    <tr>
      <td align="center">
        <table width="520" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.08);">
          <tr>
            <td style="background:#005124;padding:32px 40px;text-align:center;">
              <p style="margin:0;font-size:26px;font-weight:700;color:#ffffff;letter-spacing:-0.5px;">edrive</p>
              <p style="margin:6px 0 0;font-size:13px;color:#a3d4b5;">Travel Smarter, Travel Together</p>
            </td>
          </tr>
          <tr>
            <td style="padding:40px;">
              <p style="margin:0 0 12px;font-size:24px;font-weight:700;color:#111;">Welcome to edrive, ${firstName}</p>
              <p style="margin:0 0 18px;font-size:15px;color:#555;line-height:1.7;">
                We are so happy to have you here. You are now part of a warm and reliable community built to make every trip feel easier, safer, and more comfortable.
              </p>
              <p style="margin:0 0 18px;font-size:15px;color:#555;line-height:1.7;">
                Whenever you need to move, edrive is ready to help you get there with confidence. Open the app, request a ride, follow your trip in real time, and enjoy the peace of mind that comes with a smooth journey.
              </p>
              <div style="background:#f0f9f4;border-radius:12px;padding:20px 22px;margin:28px 0;">
                <p style="margin:0 0 10px;font-size:14px;font-weight:700;color:#005124;">A few lovely things you can do now</p>
                <ul style="margin:0;padding-left:18px;color:#555;font-size:14px;line-height:1.8;">
                  <li>Request your first ride in seconds</li>
                  <li>Save frequent pickup and dropoff places</li>
                  <li>Track your trip and stay informed at every step</li>
                </ul>
              </div>
              <p style="margin:0;font-size:14px;color:#666;line-height:1.7;">
                Thank you for choosing edrive. We are excited to ride with you.
              </p>
            </td>
          </tr>
          <tr>
            <td style="background:#f9f9f9;padding:20px 40px;border-top:1px solid #eee;text-align:center;">
              <p style="margin:0;font-size:12px;color:#aaa;">&copy; ${new Date().getFullYear()} edrive. All rights reserved.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
  }

  private buildDriverWelcomeEmail(firstName: string): string {
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
</head>
<body style="margin:0;padding:0;background:#f4f4f4;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f4;padding:40px 0;">
    <tr>
      <td align="center">
        <table width="520" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.08);">
          <tr>
            <td style="background:#005124;padding:32px 40px;text-align:center;">
              <p style="margin:0;font-size:26px;font-weight:700;color:#ffffff;letter-spacing:-0.5px;">edrive</p>
              <p style="margin:6px 0 0;font-size:13px;color:#a3d4b5;">Travel Smarter, Travel Together</p>
            </td>
          </tr>
          <tr>
            <td style="padding:40px;">
              <p style="margin:0 0 12px;font-size:24px;font-weight:700;color:#111;">Welcome to edrive, ${firstName}</p>
              <p style="margin:0 0 18px;font-size:15px;color:#555;line-height:1.7;">
                We are glad to welcome you as a driver on edrive. You are one step closer to getting on the road with us.
              </p>
              <p style="margin:0 0 18px;font-size:15px;color:#555;line-height:1.7;">
                To start receiving trips, please complete your driver onboarding in the app and submit your account for verification.
              </p>
              <div style="background:#f0f9f4;border-radius:12px;padding:20px 22px;margin:28px 0;">
                <p style="margin:0 0 10px;font-size:14px;font-weight:700;color:#005124;">Next steps to get verified</p>
                <ol style="margin:0;padding-left:18px;color:#555;font-size:14px;line-height:1.8;">
                  <li>Complete your personal profile</li>
                  <li>Upload your vehicle details</li>
                  <li>Add your valid license and required documents</li>
                  <li>Submit everything for review in the app</li>
                </ol>
              </div>
              <p style="margin:0;font-size:14px;color:#666;line-height:1.7;">
                Once your details are reviewed and approved, you will be ready to start driving with edrive.
              </p>
            </td>
          </tr>
          <tr>
            <td style="background:#f9f9f9;padding:20px 40px;border-top:1px solid #eee;text-align:center;">
              <p style="margin:0;font-size:12px;color:#aaa;">&copy; ${new Date().getFullYear()} edrive. All rights reserved.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
  }
}
