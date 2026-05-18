using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Movie.API.Migrations
{
    /// <inheritdoc />
    public partial class AddAppealsCreditToUser : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "AppealsCredit",
                table: "Users",
                type: "int",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.UpdateData(
                table: "Users",
                keyColumn: "Id",
                keyValue: 1,
                columns: new[] { "AppealsCredit", "PasswordHash" },
                values: new object[] { 0, "$2a$11$OC78WwkHXF7FRY6ugvFRleQxd/hb82xYzcqX6oeDRr5ibUZOYlxXO" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "AppealsCredit",
                table: "Users");

            migrationBuilder.UpdateData(
                table: "Users",
                keyColumn: "Id",
                keyValue: 1,
                column: "PasswordHash",
                value: "$2a$11$ppykqpfR3pFM8L8WOKXxr.eEjzEor.xBqOvRYeLI7/iIdFyTj/F82");
        }
    }
}
