using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Movie.API.Migrations
{
    /// <inheritdoc />
    public partial class AddPremiumReminderFlags : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "PremiumReminder1Sent",
                table: "Users",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<bool>(
                name: "PremiumReminder7Sent",
                table: "Users",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.UpdateData(
                table: "Users",
                keyColumn: "Id",
                keyValue: 1,
                columns: new[] { "PasswordHash", "PremiumReminder1Sent", "PremiumReminder7Sent" },
                values: new object[] { "$2a$11$1g/xdDKCww9lEDanKmJm3uUVsFyNID5y9Y8/oVF5yMoIXCeB1Y0dS", false, false });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "PremiumReminder1Sent",
                table: "Users");

            migrationBuilder.DropColumn(
                name: "PremiumReminder7Sent",
                table: "Users");

            migrationBuilder.UpdateData(
                table: "Users",
                keyColumn: "Id",
                keyValue: 1,
                column: "PasswordHash",
                value: "$2a$11$OC78WwkHXF7FRY6ugvFRleQxd/hb82xYzcqX6oeDRr5ibUZOYlxXO");
        }
    }
}
